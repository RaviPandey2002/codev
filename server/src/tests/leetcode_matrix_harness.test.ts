import { executeCode } from '../services/execution.service.js';

/**
 * LeetCode 2D Matrix & Advanced Parser Test Suite
 *
 * Verifies that:
 * 1. 2D vector input to int output (e.g. numIslands / matrix traversal) parses and runs cleanly.
 * 2. 2D vector to 2D vector (e.g. transpose / matrix transformation) parses and formats output cleanly.
 * 3. Multi-line class declarations with comments and private helper methods are accurately parsed.
 */

async function runMatrixHarnessTest() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode 2D Matrix & Advanced Parser Test');
  console.log('=====================================================\n');

  // Test 1: 2D vector -> int (Connected components / island count)
  console.log('▶ Test 1: 2D Vector -> int (numIslands / connected components)...');
  const cppNumIslands = `
class Solution {
public:
    void dfs(vector<vector<int>>& grid, int r, int c) {
        if (r < 0 || r >= grid.size() || c < 0 || c >= grid[0].size() || grid[r][c] != 1) return;
        grid[r][c] = 0;
        dfs(grid, r + 1, c);
        dfs(grid, r - 1, c);
        dfs(grid, r, c + 1);
        dfs(grid, r, c - 1);
    }

    int numIslands(vector<vector<int>>& grid) {
        if (grid.empty()) return 0;
        int count = 0;
        for (int r = 0; r < grid.size(); ++r) {
            for (int c = 0; c < grid[0].size(); ++c) {
                if (grid[r][c] == 1) {
                    count++;
                    dfs(grid, r, c);
                }
            }
        }
        return count;
    }
};
`.trim();

  const res1 = await executeCode({
    language: 'cpp',
    code: cppNumIslands,
    stdin: '[[1,1,0],[1,1,0],[0,0,1]]',
  });

  if (res1.status === 'SUCCESS' && res1.stdout.trim() === '2') {
    console.log(`  ✅ PASSED: Output: ${res1.stdout.trim()} (time: ${res1.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res1.status}, Stdout: ${res1.stdout}, Stderr: ${res1.stderr}\n`);
    process.exit(1);
  }

  // Test 2: 2D vector -> 2D vector (Matrix Transpose)
  console.log('▶ Test 2: 2D Vector -> 2D Vector (Matrix Transpose)...');
  const cppTranspose = `
class Solution {
public:
    vector<vector<int>> transpose(vector<vector<int>>& matrix) {
        int m = matrix.size();
        int n = matrix[0].size();
        vector<vector<int>> result(n, vector<int>(m));
        for (int i = 0; i < m; ++i) {
            for (int j = 0; j < n; ++j) {
                result[j][i] = matrix[i][j];
            }
        }
        return result;
    }
};
`.trim();

  const res2 = await executeCode({
    language: 'cpp',
    code: cppTranspose,
    stdin: '[[1,2,3],[4,5,6],[7,8,9]]',
  });

  if (res2.status === 'SUCCESS' && res2.stdout.trim() === '[[1,4,7],[2,5,8],[3,6,9]]') {
    console.log(`  ✅ PASSED: Output: ${res2.stdout.trim()} (time: ${res2.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res2.status}, Stdout: ${res2.stdout}, Stderr: ${res2.stderr}\n`);
    process.exit(1);
  }

  // Test 3: Multi-line public section with preceding comments and private helpers
  console.log('▶ Test 3: Complex multi-line class layout with private helper method...');
  const cppComplexLayout = `
// Solution comment block
/* Multi-line explanation:
   This solution uses a private helper.
*/
class Solution {
private:
    int helperMultiply(int a, int b) {
        return a * b;
    }

public:
    int multiplyElements(int x) {
        return helperMultiply(x, 3);
    }
};
`.trim();

  const res3 = await executeCode({
    language: 'cpp',
    code: cppComplexLayout,
    stdin: '7',
  });

  if (res3.status === 'SUCCESS' && res3.stdout.trim() === '21') {
    console.log(`  ✅ PASSED: Output: ${res3.stdout.trim()} (time: ${res3.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res3.status}, Stdout: ${res3.stdout}, Stderr: ${res3.stderr}\n`);
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🏁 All 2D Matrix & Advanced Parser Tests Passed!');
  console.log('=====================================================\n');
}

runMatrixHarnessTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
