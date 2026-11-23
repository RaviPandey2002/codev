import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CompilerProfile, ExecutionLanguage } from '@codev/shared';

export const PISTON_FILE_NAMES: Record<ExecutionLanguage, string> = {
  cpp: 'main.cpp',
  c: 'main.c',
  python: 'main.py',
  javascript: 'main.js',
  typescript: 'main.ts',
};

export const PISTON_LANGUAGE_MAP: Record<ExecutionLanguage, { language: string; version: string }> = {
  cpp: { language: 'c++', version: '*' },
  c: { language: 'c', version: '*' },
  python: { language: 'python', version: '*' },
  javascript: { language: 'javascript', version: '*' },
  typescript: { language: 'typescript', version: '*' },
};

export function getCompileArgs(
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

export function getTsxBinary(): string {
  try {
    const fromMeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../node_modules/.bin/tsx');
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
