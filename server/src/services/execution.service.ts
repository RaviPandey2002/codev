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

let hasPrlimitChecked = false;
let hasPrlimit = false;

function isPrlimitAvailable(): boolean {
  if (!hasPrlimitChecked) {
    hasPrlimitChecked = true;
    try {
      hasPrlimit = process.platform === 'linux' && existsSync('/usr/bin/prlimit');
    } catch {
      hasPrlimit = false;
    }
  }
  return hasPrlimit;
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  stdinInput: string,
  timeoutMs: number,
  options?: { sandboxed?: boolean; applyMemoryCap?: boolean }
): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const startTime = performance.now();

    // Kernel sandboxing via prlimit on Linux:
    // Only wrap when explicitly requested (for running user code, never for g++ compiler tooling)
    let actualCommand = command;
    let actualArgs = args;

    if (options?.sandboxed && isPrlimitAvailable()) {
      const prlimitArgs: string[] = ['--fsize=5242880']; // 5MB max output file
      if (options.applyMemoryCap) {
        prlimitArgs.push('--as=268435456'); // 256MB virtual memory cap
      }
      // Only enforce nproc if running under a dedicated sandbox UID,
      // because Linux RLIMIT_NPROC is per-UID across the entire OS.
      if (process.env.SANDBOX_UID) {
        prlimitArgs.push('--nproc=30');
      }
      actualArgs = [...prlimitArgs, command, ...args];
      actualCommand = '/usr/bin/prlimit';
    }

    const spawnOptions: any = {
      cwd,
      env: {
        PATH: process.env.PATH,
        NODE_OPTIONS: '--max-old-space-size=128',
      },
      detached: process.platform !== 'win32',
    };

    if (process.env.SANDBOX_UID) {
      spawnOptions.uid = parseInt(process.env.SANDBOX_UID, 10);
    }
    if (process.env.SANDBOX_GID) {
      spawnOptions.gid = parseInt(process.env.SANDBOX_GID, 10);
    }

    const child = spawn(actualCommand, actualArgs, spawnOptions);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const killChild = () => {
      try {
        if (child.pid && process.platform !== 'win32') {
          process.kill(-child.pid, 'SIGKILL');
        } else {
          child.kill('SIGKILL');
        }
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {}
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killChild();
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += chunk.toString('utf-8');
        if (stdout.length >= MAX_OUTPUT_BYTES) {
          stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + '\n[Output truncated at 64KB]';
          killChild();
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += chunk.toString('utf-8');
        if (stderr.length >= MAX_OUTPUT_BYTES) {
          stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + '\n[Error output truncated at 64KB]';
          killChild();
        }
      }
    });

    child.stdin.on('error', () => {
      // Prevent uncaught EPIPE if child process terminates before reading all stdin
    });

    if (stdinInput) {
      // Normalize Windows CRLF to LF and ensure stdin ends with newline,
      // preventing EOF truncation and trailing \r issues in C++ getline / cin
      const normalizedStdin = stdinInput.replace(/\r\n/g, '\n');
      child.stdin.write(normalizedStdin.endsWith('\n') ? normalizedStdin : normalizedStdin + '\n');
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

export function injectLeetCodeCppDriver(code: string): string {
  // If user already defined main(), don't inject
  if (/\bint\s+main\s*\(/.test(code)) return code;
  if (!/class\s+Solution\b/.test(code)) return code;

  // Detect method inside class Solution
  const methodMatch = code.match(
    /(?:public\s*:)?\s*([a-zA-Z0-9_<>,:\s*&]+?)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/
  );

  let driver = '';

  if (methodMatch) {
    const returnType = methodMatch[1].trim();
    const methodName = methodMatch[2].trim();
    const argsStr = methodMatch[3].trim();

    // TwoSum pattern or (vector<int>, int) -> vector<int>
    if (argsStr.includes('vector<int>') && argsStr.includes('int') && returnType.includes('vector<int>')) {
      driver = `
// ========================================================
// [CodeV Injected LeetCode Driver]
// ========================================================
#include <iostream>
#include <string>
#include <sstream>
#include <vector>

static std::vector<int> __codev_parse_vector_int(std::string s) {
    std::vector<int> res;
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    int num;
    while (ss >> num) res.push_back(num);
    return res;
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    std::vector<int> ans = sol.${methodName}(nums, target);

    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
    } else if (returnType === 'int' && argsStr.includes('vector<int>')) {
      driver = `
#include <iostream>
#include <string>
#include <sstream>
#include <vector>

static std::vector<int> __codev_parse_vector_int(std::string s) {
    std::vector<int> res;
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    int num;
    while (ss >> num) res.push_back(num);
    return res;
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    int ans = sol.${methodName}(nums);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
  }

  // Fallback to standard TwoSum driver if signature not matched
  if (!driver) {
    driver = `
#include <iostream>
#include <string>
#include <sstream>
#include <vector>

static std::vector<int> __codev_parse_vector_int(std::string s) {
    std::vector<int> res;
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    int num;
    while (ss >> num) res.push_back(num);
    return res;
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    std::vector<int> ans = sol.twoSum(nums, target);

    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
  }

  return `${code}\n${driver}`;
}

export function injectLeetCodePythonDriver(code: string): string {
  // If user already defined __main__, don't inject
  if (/__name__\s*==\s*['"]__main__['"]/.test(code)) return code;
  if (!/class\s+Solution\b/.test(code)) return code;

  const header = `from typing import *
import collections
import heapq
import bisect
import math
import sys
import json

`;

  const driver = `
# ========================================================
# [CodeV Injected LeetCode Driver]
# ========================================================
if __name__ == "__main__":
    lines = [line.strip() for line in sys.stdin if line.strip()]
    if lines:
        sol = Solution()
        method_names = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
        if method_names:
            func = getattr(sol, method_names[0])
            parsed_args = []
            for line in lines:
                try:
                    parsed_args.append(json.loads(line))
                except Exception:
                    parsed_args.append(line)
            res = func(*parsed_args)
            if isinstance(res, bool):
                print("true" if res else "false")
            elif isinstance(res, (list, dict)):
                print(json.dumps(res, separators=(',', ':')))
            elif res is not None:
                print(res)
`;

  return `${header}${code}\n${driver}`;
}

const executeViaLocal = async (params: ExecutionParams): Promise<ExecutionResult> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codev-run-'));

  try {
    const { language, compilerProfile = 'default', code, stdin = '', triggeredBy } = params;

    // 1. Compiled Languages (C++ and C)
    if (language === 'cpp' || language === 'c') {
      // Disallow absolute paths or directory traversal in #include to prevent host file exfiltration
      if (/#\s*include\s*["<](\s*\/|\s*\.\.)/.test(code)) {
        return {
          stdout: '',
          stderr: 'SecurityError: Absolute paths and directory traversal in #include directives are forbidden.',
          exitCode: 1,
          executionTimeMs: 0,
          status: 'COMPILE_ERROR',
          triggeredBy,
          timestamp: new Date().toISOString(),
        };
      }

      const sourceFile = language === 'cpp' ? 'main.cpp' : 'main.c';
      const compiler = language === 'cpp' ? 'g++' : 'gcc';
      const compileArgs = getCompileArgs(language, compilerProfile, sourceFile);

      const codeToWrite = language === 'cpp' ? injectLeetCodeCppDriver(code) : code;
      await fs.writeFile(path.join(tempDir, sourceFile), codeToWrite, 'utf-8');

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
        EXECUTION_TIMEOUT_MS,
        { sandboxed: true, applyMemoryCap: true }
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
      args = ['--max-old-space-size=128', sourceFile];
    } else if (language === 'typescript') {
      sourceFile = 'main.ts';
      command = getTsxBinary();
      args = [sourceFile];
    }

    const codeToWrite = language === 'python' ? injectLeetCodePythonDriver(code) : code;
    await fs.writeFile(path.join(tempDir, sourceFile), codeToWrite, 'utf-8');

    const runRes = await runProcess(
      command,
      args,
      tempDir,
      stdin,
      EXECUTION_TIMEOUT_MS,
      { sandboxed: true, applyMemoryCap: language === 'python' }
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

  // Self-hosted Piston instance endpoint (e.g. your own Docker container on port 2000)
  const pistonUrl = process.env.PISTON_API_URL || 'http://localhost:2000/api/v2/execute';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.PISTON_API_KEY) {
    headers['Authorization'] = process.env.PISTON_API_KEY;
  }

  try {
    const response = await fetch(pistonUrl, {
      method: 'POST',
      headers,
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
  const driver = process.env.EXECUTION_DRIVER || 'local';

  if (driver === 'piston') {
    try {
      return await executeViaPiston(params);
    } catch (error: any) {
      console.warn('Self-hosted Piston sandbox unavailable, falling back to local runner:', error?.message);
      return await executeViaLocal(params);
    }
  }

  return await executeViaLocal(params);
}
