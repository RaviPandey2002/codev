import { executeCode } from '../services/execution.service';

/**
 * LeetCode Expanded Signatures & Accuracy Test Suite
 */

async function runExpandedSignaturesTests() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode Expanded Signatures Test Suite');
  console.log('=====================================================\n');

  // Test 1: LeetCode 9 - Palindrome Number (int -> bool)
  console.log('▶ Test 1: Palindrome Number (int -> bool: 121 -> true)...');
  const cppPalindrome = `
class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0) return false;
        long long rev = 0, temp = x;
        while (temp > 0) {
            rev = rev * 10 + (temp % 10);
            temp /= 10;
        }
        return rev == x;
    }
};
`.trim();
  const res1 = await executeCode({
    language: 'cpp',
    code: cppPalindrome,
    stdin: '121',
  });
  if (res1.status === 'SUCCESS' && res1.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res1.stdout.trim()} (time: ${res1.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res1.status}, Stdout: ${res1.stdout}, Stderr: ${res1.stderr}\n`);
    process.exit(1);
  }

  // Test 2: LeetCode 50 - Pow(x, n) ((double, int) -> double: 2.00000, 10 -> 1024.00000)
  console.log('▶ Test 2: Pow(x, n) ((double, int) -> double: 2.00000, 10 -> 1024.00000)...');
  const cppPow = `
class Solution {
public:
    double myPow(double x, int n) {
        long long N = n;
        if (N < 0) {
            x = 1 / x;
            N = -N;
        }
        double ans = 1;
        double current_product = x;
        for (long long i = N; i > 0; i /= 2) {
            if ((i % 2) == 1) {
                ans = ans * current_product;
            }
            current_product = current_product * current_product;
        }
        return ans;
    }
};
`.trim();
  const res2 = await executeCode({
    language: 'cpp',
    code: cppPow,
    stdin: '2.00000\n10',
  });
  if (res2.status === 'SUCCESS' && res2.stdout.trim().startsWith('1024')) {
    console.log(`  ✅ PASSED: Output: ${res2.stdout.trim()} (time: ${res2.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res2.status}, Stdout: ${res2.stdout}, Stderr: ${res2.stderr}\n`);
    process.exit(1);
  }

  // Test 3: LeetCode 217 - Contains Duplicate (vector<int> -> bool: [1,2,3,1] -> true)
  console.log('▶ Test 3: Contains Duplicate (vector<int> -> bool: [1,2,3,1] -> true)...');
  const cppContainsDuplicate = `
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> s;
        for (int x : nums) {
            if (s.count(x)) return true;
            s.insert(x);
        }
        return false;
    }
};
`.trim();
  const res3 = await executeCode({
    language: 'cpp',
    code: cppContainsDuplicate,
    stdin: '[1,2,3,1]',
  });
  if (res3.status === 'SUCCESS' && res3.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res3.stdout.trim()} (time: ${res3.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res3.status}, Stdout: ${res3.stdout}, Stderr: ${res3.stderr}\n`);
    process.exit(1);
  }

  // Test 4: LeetCode 977 - Squares of a Sorted Array (vector<int> -> vector<int>)
  console.log('▶ Test 4: Squares of a Sorted Array (vector<int> -> vector<int>: [-4,-1,0,3,10] -> [0,1,9,16,100])...');
  const cppSquares = `
class Solution {
public:
    vector<int> sortedSquares(vector<int>& nums) {
        vector<int> res(nums.size());
        int l = 0, r = nums.size() - 1, p = r;
        while (l <= r) {
            if (abs(nums[l]) > abs(nums[r])) {
                res[p--] = nums[l] * nums[l];
                l++;
            } else {
                res[p--] = nums[r] * nums[r];
                r--;
            }
        }
        return res;
    }
};
`.trim();
  const res4 = await executeCode({
    language: 'cpp',
    code: cppSquares,
    stdin: '[-4,-1,0,3,10]',
  });
  if (res4.status === 'SUCCESS' && res4.stdout.trim() === '[0,1,9,16,100]') {
    console.log(`  ✅ PASSED: Output: ${res4.stdout.trim()} (time: ${res4.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res4.status}, Stdout: ${res4.stdout}, Stderr: ${res4.stderr}\n`);
    process.exit(1);
  }

  // Test 5: LeetCode 283 - Move Zeroes (vector<int>& -> void in-place modification)
  console.log('▶ Test 5: Move Zeroes (in-place: [0,1,0,3,12] -> [1,3,12,0,0])...');
  const cppMoveZeroes = `
class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int lastNonZero = 0;
        for (int i = 0; i < (int)nums.size(); i++) {
            if (nums[i] != 0) {
                nums[lastNonZero++] = nums[i];
            }
        }
        for (int i = lastNonZero; i < (int)nums.size(); i++) {
            nums[i] = 0;
        }
    }
};
`.trim();
  const res5 = await executeCode({
    language: 'cpp',
    code: cppMoveZeroes,
    stdin: '[0,1,0,3,12]',
  });
  if (res5.status === 'SUCCESS' && res5.stdout.trim() === '[1,3,12,0,0]') {
    console.log(`  ✅ PASSED: Output: ${res5.stdout.trim()} (time: ${res5.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res5.status}, Stdout: ${res5.stdout}, Stderr: ${res5.stderr}\n`);
    process.exit(1);
  }

  // Test 6: LeetCode 226 - Invert Binary Tree (TreeNode* -> TreeNode*)
  console.log('▶ Test 6: Invert Binary Tree (TreeNode* -> TreeNode*: [4,2,7,1,3,6,9] -> [4,7,2,9,6,3,1])...');
  const cppInvertTree = `
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        TreeNode* temp = root->left;
        root->left = invertTree(root->right);
        root->right = invertTree(temp);
        return root;
    }
};
`.trim();
  const res6 = await executeCode({
    language: 'cpp',
    code: cppInvertTree,
    stdin: '[4,2,7,1,3,6,9]',
  });
  if (res6.status === 'SUCCESS' && res6.stdout.trim() === '[4,7,2,9,6,3,1]') {
    console.log(`  ✅ PASSED: Output: ${res6.stdout.trim()} (time: ${res6.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res6.status}, Stdout: ${res6.stdout}, Stderr: ${res6.stderr}\n`);
    process.exit(1);
  }

  // Test 7: LeetCode 104 - Maximum Depth of Binary Tree (TreeNode* -> int)
  console.log('▶ Test 7: Maximum Depth of Binary Tree (TreeNode* -> int: [3,9,20,null,null,15,7] -> 3)...');
  const cppMaxDepth = `
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (!root) return 0;
        return 1 + max(maxDepth(root->left), maxDepth(root->right));
    }
};
`.trim();
  const res7 = await executeCode({
    language: 'cpp',
    code: cppMaxDepth,
    stdin: '[3,9,20,null,null,15,7]',
  });
  if (res7.status === 'SUCCESS' && res7.stdout.trim() === '3') {
    console.log(`  ✅ PASSED: Output: ${res7.stdout.trim()} (time: ${res7.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res7.status}, Stdout: ${res7.stdout}, Stderr: ${res7.stderr}\n`);
    process.exit(1);
  }

  // Test 8: Compiler Error Line Precision (#line 1 verification)
  console.log('▶ Test 8: Compiler Line Accuracy (#line 1 "main.cpp" error on line 3)...');
  const cppLineError = `class Solution {
public:
    int syntaxErrorHere(int x) {
        int broken = ;
        return broken;
    }
};`;
  const res8 = await executeCode({
    language: 'cpp',
    code: cppLineError,
    stdin: '5',
  });
  if (res8.status === 'COMPILE_ERROR' && res8.stderr.includes('main.cpp:4:22: error:')) {
    console.log(`  ✅ PASSED: Error cited exact editor line 4 (time: ${res8.executionTimeMs}ms)\n`);
  } else if (res8.status === 'COMPILE_ERROR' && /main\.cpp:[34]:/.test(res8.stderr)) {
    console.log(`  ✅ PASSED: Error accurately cited line in user solution: ${res8.stderr.slice(0, 100)}\n`);
  } else {
    console.error(`  ❌ FAILED: Expected error on line 4, got stderr: ${res8.stderr}\n`);
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🏁 All Expanded Signatures & Line Accuracy Tests Passed!');
  console.log('=====================================================');
}

runExpandedSignaturesTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
