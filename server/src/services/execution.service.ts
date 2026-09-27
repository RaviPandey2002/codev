import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
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

export async function executeCode(params: {
  language: ExecutionLanguage;
  compilerProfile?: CompilerProfile;
  code: string;
  stdin?: string;
  triggeredBy?: string;
}): Promise<ExecutionResult> {
  const {
    language,
    compilerProfile = 'default',
    code,
    stdin = '',
    triggeredBy,
  } = params;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codev-run-'));

  try {
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

      return {
        stdout: runRes.stdout,
        stderr: runRes.timedOut
          ? `${runRes.stderr}\nExecution timed out after ${EXECUTION_TIMEOUT_MS}ms.`.trim()
          : runRes.stderr,
        exitCode: runRes.exitCode,
        executionTimeMs: runRes.durationMs,
        status: runRes.timedOut
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
      command = new URL('../../node_modules/.bin/tsx', import.meta.url).pathname;
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

    return {
      stdout: runRes.stdout,
      stderr: runRes.timedOut
        ? `${runRes.stderr}\nExecution timed out after ${EXECUTION_TIMEOUT_MS}ms.`.trim()
        : runRes.stderr,
      exitCode: runRes.exitCode,
      executionTimeMs: runRes.durationMs,
      status: runRes.timedOut
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
}
