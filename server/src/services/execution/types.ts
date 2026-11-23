import type {
  CompilerProfile,
  ExecutionLanguage,
  ExecutionResult,
} from '@codev/shared';

export const EXECUTION_TIMEOUT_MS = 5000;
export const MAX_OUTPUT_BYTES = 64 * 1024;

export interface SpawnOutcome {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

export interface ExecutionParams {
  language: ExecutionLanguage;
  compilerProfile?: CompilerProfile;
  code: string;
  stdin?: string;
  triggeredBy?: string;
}

export interface PistonExecutionResponse {
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
