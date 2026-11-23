import type { ExecutionResult } from '@codev/shared';
import { EXECUTION_TIMEOUT_MS, ExecutionParams, PistonExecutionResponse } from '../types.js';
import { PISTON_FILE_NAMES, PISTON_LANGUAGE_MAP } from './compiler_config.js';

export async function executeViaPiston(params: ExecutionParams): Promise<ExecutionResult> {
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
