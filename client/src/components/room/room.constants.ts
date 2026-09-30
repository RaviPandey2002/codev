import type { ExecutionLanguage } from '@codev/shared';

export const CUSTOM_TEMPLATES_STORAGE_KEY = 'codev:user-templates:v1';
export const COLUMN_ORDER_STORAGE_KEY = 'codev:room-col-order:v1';
export const LEFT_FOLDED_STORAGE_KEY = 'codev:room-left-folded:v1';
export const RIGHT_FOLDED_STORAGE_KEY = 'codev:room-right-folded:v1';

export type ColumnId = 'context' | 'editor' | 'io';

export const LANGUAGE_META: Record<
  ExecutionLanguage,
  { label: string; ext: string; fileName: string; template: string }
> = {
  cpp: {
    label: 'C++20 (g++)',
    ext: 'cpp',
    fileName: 'main.cpp',
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cout << "Hello from CodeV C++!" << "\\n";
    return 0;
}
`,
  },
  c: {
    label: 'C17 (gcc)',
    ext: 'c',
    fileName: 'main.c',
    template: `#include <stdio.h>

int main(void) {
    printf("Hello from CodeV C!\\n");
    return 0;
}
`,
  },
  python: {
    label: 'Python 3',
    ext: 'py',
    fileName: 'main.py',
    template: `import sys

def main() -> None:
    print("Hello from CodeV Python!")

if __name__ == "__main__":
    main()
`,
  },
  typescript: {
    label: 'TypeScript',
    ext: 'ts',
    fileName: 'main.ts',
    template: `function solve(): void {
  console.log("Hello from CodeV TypeScript!");
}

solve();
`,
  },
  javascript: {
    label: 'JavaScript',
    ext: 'js',
    fileName: 'main.js',
    template: `function main() {
  console.log("Hello from CodeV JavaScript!");
}

main();
`,
  },
};

export const DEFAULT_PROBLEM_NOTES = `# Problem / Shared Notes

Paste a problem statement, constraints, or algorithm dry-run notes here.

Example:
Input:
5
1 2 3 4 5

Output:
15
`;

export function inferInitialLanguage(path?: string): ExecutionLanguage {
  if (!path) return 'cpp';
  if (path.endsWith('.cpp') || path.endsWith('.cc')) return 'cpp';
  if (path.endsWith('.c')) return 'c';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.js')) return 'javascript';
  return 'typescript';
}

export function loadSavedTemplates(): Partial<Record<ExecutionLanguage, string>> {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function loadColumnOrder(): ColumnId[] {
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!raw) return ['context', 'editor', 'io'];
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.includes('context') &&
      parsed.includes('editor') &&
      parsed.includes('io')
    ) {
      return parsed as ColumnId[];
    }
  } catch {
    // Ignore
  }
  return ['context', 'editor', 'io'];
}

export function isBuiltInBoilerplate(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;
  if (trimmed.includes('Welcome to CodeV')) return true;
  if (trimmed.includes('CodeV Competitive Programming Arena')) return true;
  if (trimmed.includes('CodeV Online C Compiler')) return true;
  if (trimmed.includes('CodeV Python Workspace')) return true;
  if (trimmed.includes('CodeV JavaScript Workspace')) return true;
  return Object.values(LANGUAGE_META).some((m) => m.template.trim() === trimmed);
}
