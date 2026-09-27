import { z } from 'zod';

export const executionLanguageSchema = z.enum([
  'typescript',
  'javascript',
  'python',
  'cpp',
  'c',
]);

export type ExecutionLanguage = z.infer<typeof executionLanguageSchema>;

export const compilerProfileSchema = z.enum([
  'default', // -O2 (C++20 / C17)
  'debug',   // -Wall -Wextra -fsanitize=address,undefined
  'o3',      // -O3 aggressive optimization
  'cpp17',   // -O2 -std=c++17
]);

export type CompilerProfile = z.infer<typeof compilerProfileSchema>;

export const executeCodeSchema = z.object({
  language: executionLanguageSchema,
  compilerProfile: compilerProfileSchema.optional().default('default'),
  code: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(100_000, 'Code size cannot exceed 100KB'),
  stdin: z
    .string()
    .max(50_000, 'Standard input cannot exceed 50KB')
    .optional()
    .default(''),
});

export type ExecuteCodeInput = z.input<typeof executeCodeSchema>;

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  status: 'SUCCESS' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  triggeredBy?: string;
  timestamp?: string;
}