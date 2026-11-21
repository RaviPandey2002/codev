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

export const PYTHON_LEETCODE_HEADER = `from typing import *
import collections
import heapq
import bisect
import math
import sys
import json

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __codev_build_list(vals):
    if not isinstance(vals, list):
        return vals
    dummy = ListNode(0)
    cur = dummy
    for v in vals:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def __codev_list_to_array(node):
    res = []
    cur = node
    while cur:
        res.append(cur.val)
        cur = cur.next
    return res

def __codev_build_tree(vals):
    if not isinstance(vals, list) or not vals:
        return None
    root = TreeNode(vals[0])
    queue = [root]
    i = 1
    while queue and i < len(vals):
        cur = queue.pop(0)
        if i < len(vals) and vals[i] is not None:
            cur.left = TreeNode(vals[i])
            queue.append(cur.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            cur.right = TreeNode(vals[i])
            queue.append(cur.right)
        i += 1
    return root

def __codev_tree_to_array(root):
    if not root:
        return []
    res = []
    queue = [root]
    while queue:
        cur = queue.pop(0)
        if cur:
            res.append(cur.val)
            queue.append(cur.left)
            queue.append(cur.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

`;

export function injectLeetCodeCppDriver(code: string): string {
  // If user already defined main(), don't inject
  if (/\bint\s+main\s*\(/.test(code)) return code;
  if (!/class\s+Solution\b/.test(code)) return code;

  // Clean comments before checking definitions and signatures
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const hasListNodeDef = /\bstruct\s+ListNode\b/.test(cleaned);
  const hasTreeNodeDef = /\bstruct\s+TreeNode\b/.test(cleaned);

  const header = `
// ========================================================
// [CodeV LeetCode Environment Definitions]
// ========================================================
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
#include <climits>
#include <iomanip>
using namespace std;

#ifndef __CODEV_LEETCODE_STUBS__
#define __CODEV_LEETCODE_STUBS__

${hasListNodeDef ? '' : `
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
`}

${hasTreeNodeDef ? '' : `
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`}

#endif
`;

  const methodMatch = cleaned.match(
    /(?:public|private|protected)?\s*:\s*([^;{()]+?)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/
  );

  let driver = '';

  const helperFunctions = `
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

static ListNode* __codev_build_list(const std::vector<int>& vals) {
    ListNode dummy(0);
    ListNode* cur = &dummy;
    for (int v : vals) {
        cur->next = new ListNode(v);
        cur = cur->next;
    }
    return dummy.next;
}

static void __codev_print_list(ListNode* head) {
    std::cout << "[";
    ListNode* cur = head;
    while (cur) {
        std::cout << cur->val;
        if (cur->next) std::cout << ",";
        cur = cur->next;
    }
    std::cout << "]" << std::endl;
}

static TreeNode* __codev_build_tree(std::string s) {
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    std::string token;
    std::vector<std::string> tokens;
    while (ss >> token) tokens.push_back(token);
    if (tokens.empty() || tokens[0] == "null") return nullptr;

    TreeNode* root = new TreeNode(std::stoi(tokens[0]));
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < tokens.size()) {
        TreeNode* cur = q.front();
        q.pop();
        if (i < tokens.size() && tokens[i] != "null") {
            cur->left = new TreeNode(std::stoi(tokens[i]));
            q.push(cur->left);
        }
        i++;
        if (i < tokens.size() && tokens[i] != "null") {
            cur->right = new TreeNode(std::stoi(tokens[i]));
            q.push(cur->right);
        }
        i++;
    }
    return root;
}

static void __codev_print_tree(TreeNode* root) {
    if (!root) {
        std::cout << "[]" << std::endl;
        return;
    }
    std::vector<std::string> res;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* cur = q.front();
        q.pop();
        if (cur) {
            res.push_back(std::to_string(cur->val));
            q.push(cur->left);
            q.push(cur->right);
        } else {
            res.push_back("null");
        }
    }
    while (!res.empty() && res.back() == "null") res.pop_back();
    std::cout << "[";
    for (size_t i = 0; i < res.size(); ++i) {
        std::cout << res[i] << (i + 1 < res.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}
`;

  if (methodMatch) {
    const rawReturnType = methodMatch[1].trim();
    const returnType = rawReturnType.replace(/^(?:public|private|protected)\s*:\s*/, '').trim();
    const methodName = methodMatch[2].trim();
    const argsStr = methodMatch[3].trim();
    const argsWithoutVectors = argsStr.replace(/vector\s*<\s*int\s*>/g, '');
    const hasStandaloneIntArg = /\b(int|long)\b/.test(argsWithoutVectors);

    // 1. Linked List: (ListNode*, ListNode*) -> ListNode* (e.g. addTwoNumbers, mergeTwoLists)
    if (returnType.includes('ListNode') && argsStr.includes('ListNode') && (argsStr.match(/ListNode/g) || []).length >= 2) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1, line2;
    if (!std::getline(std::cin, line1)) return 0;
    while (line1.empty() && std::getline(std::cin, line1));
    if (!std::getline(std::cin, line2)) return 0;
    while (line2.empty() && std::getline(std::cin, line2));

    ListNode* l1 = __codev_build_list(__codev_parse_vector_int(line1));
    ListNode* l2 = __codev_build_list(__codev_parse_vector_int(line2));

    Solution sol;
    ListNode* ans = sol.${methodName}(l1, l2);
    __codev_print_list(ans);
    return 0;
}
`;
    }
    // 2. Linked List: (ListNode*) -> ListNode* (e.g. reverseList, middleNode)
    else if (returnType.includes('ListNode') && argsStr.includes('ListNode')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    while (line1.empty() && std::getline(std::cin, line1));

    ListNode* head = __codev_build_list(__codev_parse_vector_int(line1));

    Solution sol;
    ListNode* ans = sol.${methodName}(head);
    __codev_print_list(ans);
    return 0;
}
`;
    }
    // 3. Linked List: (ListNode*) -> bool (e.g. hasCycle)
    else if (returnType === 'bool' && argsStr.includes('ListNode')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    while (line1.empty() && std::getline(std::cin, line1));

    ListNode* head = __codev_build_list(__codev_parse_vector_int(line1));

    Solution sol;
    bool ans = sol.${methodName}(head);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
    }
    // 4. Binary Tree: (TreeNode*) -> TreeNode* (e.g. invertTree)
    else if (returnType.includes('TreeNode') && argsStr.includes('TreeNode')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    while (line1.empty() && std::getline(std::cin, line1));

    TreeNode* root = __codev_build_tree(line1);

    Solution sol;
    TreeNode* ans = sol.${methodName}(root);
    __codev_print_tree(ans);
    return 0;
}
`;
    }
    // 5. Binary Tree: (TreeNode*) -> int (e.g. maxDepth, minDepth)
    else if (returnType === 'int' && argsStr.includes('TreeNode')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    while (line1.empty() && std::getline(std::cin, line1));

    TreeNode* root = __codev_build_tree(line1);

    Solution sol;
    int ans = sol.${methodName}(root);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
    // 6. Binary Tree: (TreeNode*) -> bool or (TreeNode*, TreeNode*) -> bool (e.g. isSameTree, isValidBST)
    else if (returnType === 'bool' && argsStr.includes('TreeNode')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    while (line1.empty() && std::getline(std::cin, line1));

    TreeNode* p = __codev_build_tree(line1);

    std::string line2;
    TreeNode* q = nullptr;
    if (std::getline(std::cin, line2)) {
        while (line2.empty() && std::getline(std::cin, line2));
        if (!line2.empty()) q = __codev_build_tree(line2);
    }

    Solution sol;
    bool ans = false;
    if (q != nullptr) {
        ans = sol.${methodName}(p, q);
    } else {
        ans = sol.${methodName}(p);
    }
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
    }
    // 7. Vector & Int -> Vector (e.g. twoSum)
    else if (argsStr.includes('vector<int>') && hasStandaloneIntArg && returnType.includes('vector<int>')) {
      driver = `
${helperFunctions}
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
    }
    // 8. Vector -> Vector (e.g. sortedSquares)
    else if (returnType.includes('vector<int>') && argsStr.includes('vector<int>') && !argsStr.includes(',')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    std::vector<int> ans = sol.${methodName}(nums);

    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
    }
    // 9. Vector -> void (in-place modification, e.g. moveZeroes, sortColors)
    else if (returnType === 'void' && argsStr.includes('vector<int>')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    sol.${methodName}(nums);

    std::cout << "[";
    for (size_t i = 0; i < nums.size(); ++i) {
        std::cout << nums[i] << (i + 1 < nums.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
    }
    // 10. Vector -> Bool (e.g. containsDuplicate)
    else if (returnType === 'bool' && argsStr.includes('vector<int>') && !argsStr.includes(',')) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    bool ans = sol.${methodName}(nums);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
    }
    // 11. Vector -> Int (e.g. maxSubArray, singleNumber, majorityElement)
    else if (returnType === 'int' && argsStr.includes('vector<int>') && !argsStr.includes(',')) {
      driver = `
${helperFunctions}
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
    // 12. Vector & Int -> Int (e.g. binarySearch / search / removeElement)
    else if (returnType === 'int' && argsStr.includes('vector<int>') && hasStandaloneIntArg) {
      driver = `
${helperFunctions}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    int ans = sol.${methodName}(nums, target);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
    // 13. (Double, Int) -> Double (e.g. myPow)
    else if (returnType.includes('double') && argsStr.includes('double') && argsStr.includes('int')) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    double x = 0.0;
    long long n = 0;
    if (!(std::cin >> x >> n)) return 0;

    Solution sol;
    double ans = sol.${methodName}(x, (int)n);
    std::cout << std::fixed << std::setprecision(5) << ans << std::endl;
    return 0;
}
`;
    }
    // 14. (Int) -> Bool (e.g. isPalindrome, isPowerOfTwo)
    else if (returnType === 'bool' && (argsStr.trim().startsWith('int') || argsStr.trim().startsWith('long')) && !argsStr.includes('vector') && !argsStr.includes('string')) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    long long n = 0;
    if (!(std::cin >> n)) return 0;

    Solution sol;
    bool ans = sol.${methodName}((int)n);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
    }
    // 15. (Int) -> Int (e.g. climbStairs, fib, reverse)
    else if ((returnType === 'int' || returnType === 'long long') && (argsStr.trim().startsWith('int') || argsStr.trim().startsWith('long')) && !argsStr.includes('vector') && !argsStr.includes('string') && !argsStr.includes(',')) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    long long n = 0;
    if (!(std::cin >> n)) return 0;

    Solution sol;
    auto ans = sol.${methodName}((int)n);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
    // 16. String -> Int (e.g. lengthOfLongestSubstring, romanToInt, myAtoi)
    else if ((returnType === 'int' || returnType === 'size_t') && argsStr.includes('string') && (argsStr.match(/string/g) || []).length === 1) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    Solution sol;
    int ans = sol.${methodName}(s);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
    // 17. String -> Bool (e.g. isValid, isPalindrome)
    else if (returnType === 'bool' && argsStr.includes('string') && (argsStr.match(/string/g) || []).length === 1) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    Solution sol;
    bool ans = sol.${methodName}(s);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
    }
    // 18. String -> String (e.g. longestCommonPrefix, reverseWords)
    else if (returnType === 'string' && argsStr.includes('string') && (argsStr.match(/string/g) || []).length === 1) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    Solution sol;
    std::string ans = sol.${methodName}(s);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
    // 19. (String, String) -> Bool (e.g. isAnagram)
    else if (returnType === 'bool' && argsStr.includes('string') && (argsStr.match(/string/g) || []).length >= 2) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s1, s2;
    if (!std::getline(std::cin, s1)) return 0;
    while (s1.empty() && std::getline(std::cin, s1));
    if (s1.size() >= 2 && s1.front() == '"' && s1.back() == '"') s1 = s1.substr(1, s1.size() - 2);

    if (!std::getline(std::cin, s2)) return 0;
    while (s2.empty() && std::getline(std::cin, s2));
    if (s2.size() >= 2 && s2.front() == '"' && s2.back() == '"') s2 = s2.substr(1, s2.size() - 2);

    Solution sol;
    bool ans = sol.${methodName}(s1, s2);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
    }
    // 20. (String, String) -> Int (e.g. strStr)
    else if ((returnType === 'int' || returnType === 'size_t') && argsStr.includes('string') && (argsStr.match(/string/g) || []).length >= 2) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s1, s2;
    if (!std::getline(std::cin, s1)) return 0;
    while (s1.empty() && std::getline(std::cin, s1));
    if (s1.size() >= 2 && s1.front() == '"' && s1.back() == '"') s1 = s1.substr(1, s1.size() - 2);

    if (!std::getline(std::cin, s2)) return 0;
    while (s2.empty() && std::getline(std::cin, s2));
    if (s2.size() >= 2 && s2.front() == '"' && s2.back() == '"') s2 = s2.substr(1, s2.size() - 2);

    Solution sol;
    int ans = sol.${methodName}(s1, s2);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
    // 21. (String, String) -> String (e.g. addStrings)
    else if (returnType === 'string' && argsStr.includes('string') && (argsStr.match(/string/g) || []).length >= 2) {
      driver = `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s1, s2;
    if (!std::getline(std::cin, s1)) return 0;
    while (s1.empty() && std::getline(std::cin, s1));
    if (s1.size() >= 2 && s1.front() == '"' && s1.back() == '"') s1 = s1.substr(1, s1.size() - 2);

    if (!std::getline(std::cin, s2)) return 0;
    while (s2.empty() && std::getline(std::cin, s2));
    if (s2.size() >= 2 && s2.front() == '"' && s2.back() == '"') s2 = s2.substr(1, s2.size() - 2);

    Solution sol;
    std::string ans = sol.${methodName}(s1, s2);
    std::cout << ans << std::endl;
    return 0;
}
`;
    }
  }

  // Graceful fallback for unrecognized/custom signatures: NO MORE HARDCODED twoSum!
  if (!driver) {
    driver = `
int main() {
    std::cout << "[CodeV Notice] Automatic test runner for this specific signature is coming soon.\\n"
              << "Tip: You can add an 'int main()' at the bottom of your code to run custom test cases."
              << std::endl;
    return 0;
}
`;
  }

  return `${header}\n#line 1 "main.cpp"\n${code}\n${driver}`;
}

export function injectLeetCodePythonDriver(code: string): string {
  // If user already defined __main__, don't inject
  if (/__name__\s*==\s*['"]__main__['"]/.test(code)) return code;
  if (!/class\s+Solution\b/.test(code)) return code;

  const header = PYTHON_LEETCODE_HEADER;

  const driver = `
# ========================================================
# [CodeV Injected LeetCode Driver]
# ========================================================
if __name__ == "__main__":
    lines = [line.strip() for line in sys.stdin if line.strip()]
    if lines:
        sol = Solution()
        # Preserve declaration order, excluding built-in attributes
        method_names = [m for m in getattr(Solution, '__dict__', {}).keys() if not m.startswith('_') and callable(getattr(Solution, m))]
        if not method_names:
            method_names = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]

        if method_names:
            func = getattr(sol, method_names[0])
            parsed_args = []
            for line in lines:
                try:
                    parsed_args.append(json.loads(line))
                except Exception:
                    parsed_args.append(line)

            # Check if method arguments expect linked lists or trees
            import inspect
            sig = inspect.signature(func)
            param_names = list(sig.parameters.keys())
            for idx, p_name in enumerate(param_names):
                if idx < len(parsed_args) and isinstance(parsed_args[idx], list):
                    param_type = str(sig.parameters[p_name].annotation)
                    if 'ListNode' in param_type or p_name in ('l1', 'l2', 'head', 'list1', 'list2'):
                        parsed_args[idx] = __codev_build_list(parsed_args[idx])
                    elif 'TreeNode' in param_type or p_name in ('root', 'p', 'q', 'node'):
                        parsed_args[idx] = __codev_build_tree(parsed_args[idx])

            res = func(*parsed_args)
            if isinstance(res, ListNode):
                print(json.dumps(__codev_list_to_array(res), separators=(',', ':')))
            elif isinstance(res, TreeNode):
                print(json.dumps(__codev_tree_to_array(res), separators=(',', ':')))
            elif isinstance(res, bool):
                print("true" if res else "false")
            elif isinstance(res, (list, dict)):
                print(json.dumps(res, separators=(',', ':')))
            elif res is not None:
                print(res)
            elif len(parsed_args) > 0 and isinstance(parsed_args[0], (list, dict)):
                # In-place modification (e.g. moveZeroes), print modified arg0
                print(json.dumps(parsed_args[0], separators=(',', ':')))
        else:
            print("[CodeV Notice] Automatic test runner for this specific signature is coming soon.")
            print("Tip: You can add an 'if __name__ == \\"__main__\\":' block to run custom test cases.")
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
    let finalStderr = runRes.stderr;
    if (language === 'python' && /class\s+Solution\b/.test(code) && finalStderr.includes('main.py')) {
      const headerLines = PYTHON_LEETCODE_HEADER.split('\n').length - 1;
      finalStderr = finalStderr.replace(/File ".*?main\.py", line (\d+)/g, (_, lineStr) => {
        const rawLine = parseInt(lineStr, 10);
        const adjusted = Math.max(1, rawLine - headerLines);
        return `File "main.py", line ${adjusted}`;
      });
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
