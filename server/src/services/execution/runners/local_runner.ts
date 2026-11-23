import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { ExecutionResult } from '@codev/shared';
import { EXECUTION_TIMEOUT_MS, ExecutionParams } from '../types.js';
import { runProcess } from './process_spawner.js';
import { getCompileArgs, getTsxBinary } from './compiler_config.js';
import {
  injectLeetCodeCppDriver,
  injectLeetCodePythonDriver,
  remapPythonTraceback,
} from '../drivers/index.js';

export async function executeViaLocal(params: ExecutionParams): Promise<ExecutionResult> {
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
    let finalStderr = runRes.stderr;
    if (language === 'python' && /class\s+Solution\b/.test(code) && finalStderr.includes('main.py')) {
      finalStderr = remapPythonTraceback(finalStderr);
    }

    return {
      stdout: runRes.stdout,
      stderr: timedOut
        ? `${finalStderr}\nExecution timed out after ${EXECUTION_TIMEOUT_MS}ms.`.trim()
        : finalStderr,
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
}
