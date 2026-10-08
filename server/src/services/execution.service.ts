import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type {
  CompilerProfile,
  ExecutionLanguage,
  ExecutionResult,
} from '@codev/shared';

const EXECUTION_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 64 * 1024;

interface SpawnOutcome {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

type ExecutionParams = {
  language: ExecutionLanguage;
  compilerProfile?: CompilerProfile;
  code: string;
  stdin?: string;
  triggeredBy?: string;
};

const PISTON_FILE_NAMES: Record<ExecutionLanguage, string> = {
  cpp: 'main.cpp',
  c: 'main.c',
  python: 'main.py',
  javascript: 'main.js',
  typescript: 'main.ts',
};
interface PistonExecutionResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number | null;
    output: string;
  };
}

function getCompileArgs(
  language: 'cpp' | 'c',
  profile: CompilerProfile,
  sourceFile: string
): string[] {
  const stdFlag =
    language === 'cpp'
      ? profile === 'cpp17'
        ? '-std=c++17'
        : '-std=c++20'
      : '-std=c17';

  switch (profile) {
    case 'debug':
      return [
        '-g',
        '-O0',
        stdFlag,
        '-Wall',
        '-Wextra',
        '-fsanitize=address,undefined',
        sourceFile,
        '-o',
        'main',
      ];
    case 'o3':
      return ['-O3', stdFlag, sourceFile, '-o', 'main'];
    case 'cpp17':
    case 'default':
    default:
      return ['-O2', stdFlag, sourceFile, '-o', 'main'];
  }
}

function getTsxBinary(): string {
  try {
    const fromMeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../node_modules/.bin/tsx');
    if (existsSync(fromMeta)) return fromMeta;
  } catch { }
  try {
    const fromCwd = path.resolve(process.cwd(), 'node_modules/.bin/tsx');
    if (existsSync(fromCwd)) return fromCwd;
  } catch { }
  try {
    const parentCwd = path.resolve(process.cwd(), '../node_modules/.bin/tsx');
    if (existsSync(parentCwd)) return parentCwd;
  } catch { }
  return 'tsx';
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  stdinInput: string,
  timeoutMs: number
): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const child = spawn(command, args, {
      cwd,
      env: { PATH: process.env.PATH },
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += chunk.toString('utf-8');
        if (stdout.length >= MAX_OUTPUT_BYTES) {
          stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + '\n[Output truncated at 64KB]';
          child.kill('SIGKILL');
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += chunk.toString('utf-8');
        if (stderr.length >= MAX_OUTPUT_BYTES) {
          stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + '\n[Error output truncated at 64KB]';
        }
      }
    });

    child.stdin.on('error', () => {
      // Prevent uncaught EPIPE if child process terminates before reading all stdin
    });

    if (stdinInput) {
      child.stdin.write(stdinInput);
    }
    child.stdin.end();

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr ? `${stderr}\n${err.message}` : err.message,
        exitCode: 1,
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
        durationMs: Math.round(performance.now() - startTime),
      });
    });
  });
}

const executeViaLocal = async (params: ExecutionParams): Promise<ExecutionResult> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codev-run-'));

  try {
    const { language, compilerProfile = 'default', code, stdin = '', triggeredBy } = params;

    // 1. Compiled Languages (C++ and C)
    if (language === 'cpp' || language === 'c') {
      const sourceFile = language === 'cpp' ? 'main.cpp' : 'main.c';
      const compiler = language === 'cpp' ? 'g++' : 'gcc';
      const compileArgs = getCompileArgs(language, compilerProfile, sourceFile);

      await fs.writeFile(path.join(tempDir, sourceFile), code, 'utf-8');

      const compileRes = await runProcess(
        compiler,
        compileArgs,
        tempDir,
        '',
        EXECUTION_TIMEOUT_MS
      );

      if (compileRes.exitCode !== 0) {
        return {
          stdout: compileRes.stdout,
          stderr: compileRes.stderr || 'Compilation failed.',
          exitCode: compileRes.exitCode,
          executionTimeMs: compileRes.durationMs,
          status: 'COMPILE_ERROR',
          triggeredBy,
          timestamp: new Date().toISOString(),
        };
      }

      const runRes = await runProcess(
        path.join(tempDir, 'main'),
        [],
        tempDir,
        stdin,
        EXECUTION_TIMEOUT_MS
      );

      const timedOut = runRes.timedOut;
      return {
        stdout: runRes.stdout,
        stderr: timedOut
          ? `${runRes.stderr}\nExecution timed out after ${EXECUTION_TIMEOUT_MS}ms.`.trim()
          : runRes.stderr,
        exitCode: runRes.exitCode,
        executionTimeMs: runRes.durationMs,
        status: timedOut
          ? 'TIME_LIMIT_EXCEEDED'
          : runRes.exitCode === 0
            ? 'SUCCESS'
            : 'RUNTIME_ERROR',
        triggeredBy,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Interpreted / JIT Languages (Python, JavaScript, TypeScript)
    let sourceFile = 'main.js';
    let command = 'node';
    let args: string[] = [];

    if (language === 'python') {
      sourceFile = 'main.py';
      command = 'python3';
      args = ['-u', sourceFile];
    } else if (language === 'javascript') {
      sourceFile = 'main.js';
      command = 'node';
      args = [sourceFile];
    } else if (language === 'typescript') {
      sourceFile = 'main.ts';
      command = getTsxBinary();
      args = [sourceFile];
    }

    await fs.writeFile(path.join(tempDir, sourceFile), code, 'utf-8');

    const runRes = await runProcess(
      command,
      args,
      tempDir,
      stdin,
      EXECUTION_TIMEOUT_MS
    );

    const timedOut = runRes.timedOut;
    return {
      stdout: runRes.stdout,
      stderr: timedOut
        ? `${runRes.stderr}\nExecution timed out after ${EXECUTION_TIMEOUT_MS}ms.`.trim()
        : runRes.stderr,
      exitCode: runRes.exitCode,
      executionTimeMs: runRes.durationMs,
      status: timedOut
        ? 'TIME_LIMIT_EXCEEDED'
        : runRes.exitCode === 0
          ? 'SUCCESS'
          : 'RUNTIME_ERROR',
      triggeredBy,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};

// -------------Piston-Code----------------

const PISTON_LANGUAGE_MAP: Record<ExecutionLanguage, { language: string; version: string }> = {
  cpp: { language: 'c++', version: '*' },
  c: { language: 'c', version: '*' },
  python: { language: 'python', version: '*' },
  javascript: { language: 'javascript', version: '*' },
  typescript: { language: 'typescript', version: '*' },
};

async function executeViaPiston(params: ExecutionParams): Promise<ExecutionResult> {
  const { language, code, stdin = '', triggeredBy } = params;

  const mapping = PISTON_LANGUAGE_MAP[language];
  if (!mapping) {
    throw new Error(`Unsupported language for Piston: ${language}`);
  }

  const controller = new AbortController();
  // 8 sec network guard
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS + 3000);
  const startTime = performance.now();

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: mapping.language,
        version: mapping.version,
        files: [
          {
            name: PISTON_FILE_NAMES[language],
            content: code,
          },
        ],
        stdin,
        run_timeout: EXECUTION_TIMEOUT_MS,
        compile_timeout: EXECUTION_TIMEOUT_MS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Piston API returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as PistonExecutionResponse;
    const durationMs = Math.round(performance.now() - startTime);

    // 1. Check for compilation errors (C / C++)
    if (data.compile && data.compile.code !== 0) {
      return {
        stdout: data.compile.stdout || '',
        stderr: data.compile.stderr || data.compile.output || 'Compilation failed.',
        exitCode: data.compile.code,
        executionTimeMs: durationMs,
        status: 'COMPILE_ERROR',
        triggeredBy,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Check for timeouts (SIGKILL signal or duration)
    const timedOut = data.run.signal === 'SIGKILL' || durationMs >= EXECUTION_TIMEOUT_MS;

    return {
      stdout: data.run.stdout || '',
      stderr: timedOut
        ? `${data.run.stderr || ''}\nExecution timed out after ${EXECUTION_TIMEOUT_MS}ms.`.trim()
        : data.run.stderr || '',
      exitCode: data.run.code,
      executionTimeMs: durationMs,
      status: timedOut
        ? 'TIME_LIMIT_EXCEEDED'
        : data.run.code === 0
          ? 'SUCCESS'
          : 'RUNTIME_ERROR',
      triggeredBy,
      timestamp: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function executeCode(params: ExecutionParams): Promise<ExecutionResult> {
  const driver = process.env.EXECUTION_DRIVER || 'piston';

  if (driver === 'local') {
    return await executeViaLocal(params);
  }

  // Production / default driver: Piston
  // We strictly DO NOT fall back to local execution on Piston failure
  // to protect the host server from untrusted code / fork bombs.
  try {
    return await executeViaPiston(params);
  } catch (error: any) {
    console.error('Piston execution error:', error);
    return {
      stdout: '',
      stderr: `Execution service error: ${error?.message || 'Remote sandbox unavailable.'}`,
      exitCode: 1,
      executionTimeMs: 0,
      status: 'RUNTIME_ERROR',
      triggeredBy: params.triggeredBy,
      timestamp: new Date().toISOString(),
    };
  }
}
