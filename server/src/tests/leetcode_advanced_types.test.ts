import { executeCode } from '../services/execution.service.js';

/**
 * LeetCode Advanced Types & Multi-line Stream Test Suite
 */

async function runAdvancedTypesTests() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode Advanced Types & Multi-line Test');
  console.log('=====================================================\n');

  // Test 1: Native LeetCode 200 Number of Islands (vector<vector<char>>& grid) with multi-line formatted input
  console.log('▶ Test 1: C++ Native Number of Islands (vector<vector<char>>) with multi-line input...');
  const cppNumIslandsChar = `
class Solution {
public:
    void dfs(vector<vector<char>>& grid, int r, int c) {
        if (r < 0 || r >= grid.size() || c < 0 || c >= grid[0].size() || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r + 1, c);
        dfs(grid, r - 1, c);
        dfs(grid, r, c + 1);
        dfs(grid, r, c - 1);
    }

    int numIslands(vector<vector<char>>& grid) {
        int count = 0;
        for (int i = 0; i < grid.size(); ++i) {
            for (int j = 0; j < grid[0].size(); ++j) {
                if (grid[i][j] == '1') {
                    count++;
                    dfs(grid, i, j);
                }
            }
        }
        return count;
    }
};
`.trim();

  const multiLineGridInput = `[
  ["1", "1", "0"],
  ["1", "1", "0"],
  ["0", "0", "1"]
]`;

  const res1 = await executeCode({
    language: 'cpp',
    code: cppNumIslandsChar,
    stdin: multiLineGridInput,
  });

  if (res1.status === 'SUCCESS' && res1.stdout.trim() === '2') {
    console.log(`  ✅ PASSED: Output: ${res1.stdout.trim()} (time: ${res1.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res1.status}, Stdout: ${res1.stdout}, Stderr: ${res1.stderr}\n`);
    process.exit(1);
  }

  // Test 2: LeetCode 14 Longest Common Prefix (vector<string>& strs -> string)
  console.log('▶ Test 2: C++ Longest Common Prefix (vector<string> -> string)...');
  const cppLongestCommonPrefix = `
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) return "";
        string prefix = strs[0];
        for (size_t i = 1; i < strs.size(); ++i) {
            while (strs[i].find(prefix) != 0) {
                prefix = prefix.substr(0, prefix.size() - 1);
                if (prefix.empty()) return "";
            }
        }
        return prefix;
    }
};
`.trim();

  const res2 = await executeCode({
    language: 'cpp',
    code: cppLongestCommonPrefix,
    stdin: '["flower","flow","flight"]',
  });

  if (res2.status === 'SUCCESS' && res2.stdout.trim() === 'fl') {
    console.log(`  ✅ PASSED: Output: ${res2.stdout.trim()} (time: ${res2.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res2.status}, Stdout: ${res2.stdout}, Stderr: ${res2.stderr}\n`);
    process.exit(1);
  }

  // Test 3: Python Multi-line Pretty-Printed JSON Input
  console.log('▶ Test 3: Python Multi-line Indented Array Input (maxSubArray)...');
  const pyMaxSubArray = `
class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        cur = ans = nums[0]
        for x in nums[1:]:
            cur = max(x, cur + x)
            ans = max(ans, cur)
        return ans
`.trim();

  const multiLineArrayInput = `[
  -2, 1, -3, 4,
  -1, 2, 1, -5, 4
]`;

  const res3 = await executeCode({
    language: 'python',
    code: pyMaxSubArray,
    stdin: multiLineArrayInput,
  });

  if (res3.status === 'SUCCESS' && res3.stdout.trim() === '6') {
    console.log(`  ✅ PASSED: Output: ${res3.stdout.trim()} (time: ${res3.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res3.status}, Stdout: ${res3.stdout}, Stderr: ${res3.stderr}\n`);
    process.exit(1);
  }

  // Test 4: Python Multiple Methods with Helper Preceding Solution
  console.log('▶ Test 4: Python Multiple Methods (helper before twoSum)...');
  const pyHelperPreceding = `
class Solution:
    def helperCompute(self, a: int, b: int) -> int:
        return a * b

    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, x in enumerate(nums):
            if target - x in seen:
                return [seen[target - x], i]
            seen[x] = i
        return []
`.trim();

  const res4 = await executeCode({
    language: 'python',
    code: pyHelperPreceding,
    stdin: '[2, 7, 11, 15]\n9',
  });

  if (res4.status === 'SUCCESS' && res4.stdout.trim() === '[0,1]') {
    console.log(`  ✅ PASSED: Output: ${res4.stdout.trim()} (time: ${res4.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res4.status}, Stdout: ${res4.stdout}, Stderr: ${res4.stderr}\n`);
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🏁 All Advanced Types & Multi-line Tests Passed!');
  console.log('=====================================================\n');
}

runAdvancedTypesTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
