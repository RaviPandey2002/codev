import { PYTHON_LEETCODE_HEADER } from './headers.js';
import { PYTHON_RUNNER_TEMPLATE } from './runner_template.js';

export { PYTHON_LEETCODE_HEADER };

export function injectLeetCodePythonDriver(code: string): string {
  // If user already defined __main__, don't inject
  if (/__name__\s*==\s*['"]__main__['"]/.test(code)) return code;
  if (!/class\s+Solution\b/.test(code)) return code;

  return `${PYTHON_LEETCODE_HEADER}${code}\n${PYTHON_RUNNER_TEMPLATE}`;
}

export function remapPythonTraceback(stderr: string): string {
  const headerLines = PYTHON_LEETCODE_HEADER.split('\n').length - 1;
  return stderr.replace(/File ".*?main\.py", line (\d+)/g, (_, lineStr) => {
    const rawLine = parseInt(lineStr, 10);
    const adjusted = Math.max(1, rawLine - headerLines);
    return `File "main.py", line ${adjusted}`;
  });
}
