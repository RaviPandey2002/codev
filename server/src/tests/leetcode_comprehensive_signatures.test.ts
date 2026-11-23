import { executeCode } from '../services/execution.service.js';

/**
 * LeetCode Comprehensive Signatures Test Suite
 *
 * Verifies that the expanded matchers cover the most popular Blind 75 / NeetCode 150 patterns:
 * 1. 3Sum: vector<int> -> vector<vector<int>>
 * 2. Combination Sum: (vector<int>, int) -> vector<vector<int>>
 * 3. Search a 2D Matrix: (vector<vector<int>>, int) -> bool
 * 4. Remove Nth Node From End: (ListNode*, int) -> ListNode*
 * 5. Path Sum: (TreeNode*, int) -> bool
 * 6. Reverse String: vector<char>& in-place void
 * 7. Generate Parentheses: int -> vector<string>
 * 8. Word Break: (string, vector<string>) -> bool
 * 9. Intersection of Two Arrays: (vector<int>, vector<int>) -> vector<int>
 * 10. Median of Two Sorted Arrays: (vector<int>, vector<int>) -> double
 */

async function runComprehensiveTests() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode Comprehensive Signatures Test Suite');
  console.log('=====================================================\n');

  // Test 1: 3Sum (vector<int> -> vector<vector<int>>)
  console.log('▶ Test 1: 3Sum (vector<int> -> vector<vector<int>>)...');
  const cppThreeSum = `
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        vector<vector<int>> res;
        sort(nums.begin(), nums.end());
        for (int i = 0; i < (int)nums.size(); ++i) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1, r = (int)nums.size() - 1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];
                if (sum == 0) {
                    res.push_back({nums[i], nums[l], nums[r]});
                    while (l < r && nums[l] == nums[l + 1]) l++;
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    l++; r--;
                } else if (sum < 0) {
                    l++;
                } else {
                    r--;
                }
            }
        }
        return res;
    }
};
`.trim();

  const res1 = await executeCode({
    language: 'cpp',
    code: cppThreeSum,
    stdin: '[-1,0,1,2,-1,-4]',
  });
  if (res1.status === 'SUCCESS' && res1.stdout.trim() === '[[-1,-1,2],[-1,0,1]]') {
    console.log(`  ✅ PASSED: Output: ${res1.stdout.trim()} (time: ${res1.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res1.status}, Stdout: ${res1.stdout}, Stderr: ${res1.stderr}\n`);
    process.exit(1);
  }

  // Test 2: Combination Sum ((vector<int>, int) -> vector<vector<int>>)
  console.log('▶ Test 2: Combination Sum ((vector<int>, int) -> vector<vector<int>>)...');
  const cppCombinationSum = `
class Solution {
public:
    void backtrack(vector<int>& candidates, int target, int start, vector<int>& cur, vector<vector<int>>& ans) {
        if (target == 0) {
            ans.push_back(cur);
            return;
        }
        for (int i = start; i < candidates.size(); ++i) {
            if (candidates[i] <= target) {
                cur.push_back(candidates[i]);
                backtrack(candidates, target - candidates[i], i, cur, ans);
                cur.pop_back();
            }
        }
    }

    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        vector<vector<int>> ans;
        vector<int> cur;
        backtrack(candidates, target, 0, cur, ans);
        return ans;
    }
};
`.trim();

  const res2 = await executeCode({
    language: 'cpp',
    code: cppCombinationSum,
    stdin: '[2,3,6,7]\n7',
  });
  if (res2.status === 'SUCCESS' && res2.stdout.trim() === '[[2,2,3],[7]]') {
    console.log(`  ✅ PASSED: Output: ${res2.stdout.trim()} (time: ${res2.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res2.status}, Stdout: ${res2.stdout}, Stderr: ${res2.stderr}\n`);
    process.exit(1);
  }

  // Test 3: Search a 2D Matrix ((vector<vector<int>>, int) -> bool)
  console.log('▶ Test 3: Search a 2D Matrix ((vector<vector<int>>, int) -> bool)...');
  const cppSearchMatrix = `
class Solution {
public:
    bool searchMatrix(vector<vector<int>>& matrix, int target) {
        if (matrix.empty() || matrix[0].empty()) return false;
        int m = matrix.size(), n = matrix[0].size();
        int l = 0, r = m * n - 1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            int val = matrix[mid / n][mid % n];
            if (val == target) return true;
            if (val < target) l = mid + 1;
            else r = mid - 1;
        }
        return false;
    }
};
`.trim();

  const res3 = await executeCode({
    language: 'cpp',
    code: cppSearchMatrix,
    stdin: '[[1,3,5,7],[10,11,16,20],[23,30,34,60]]\n3',
  });
  if (res3.status === 'SUCCESS' && res3.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res3.stdout.trim()} (time: ${res3.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res3.status}, Stdout: ${res3.stdout}, Stderr: ${res3.stderr}\n`);
    process.exit(1);
  }

  // Test 4: Remove Nth Node From End of List ((ListNode*, int) -> ListNode*)
  console.log('▶ Test 4: Remove Nth Node From End ((ListNode*, int) -> ListNode*)...');
  const cppRemoveNth = `
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);
        ListNode* first = &dummy;
        ListNode* second = &dummy;
        for (int i = 0; i <= n; ++i) first = first->next;
        while (first != nullptr) {
            first = first->next;
            second = second->next;
        }
        second->next = second->next->next;
        return dummy.next;
    }
};
`.trim();

  const res4 = await executeCode({
    language: 'cpp',
    code: cppRemoveNth,
    stdin: '[1,2,3,4,5]\n2',
  });
  if (res4.status === 'SUCCESS' && res4.stdout.trim() === '[1,2,3,5]') {
    console.log(`  ✅ PASSED: Output: ${res4.stdout.trim()} (time: ${res4.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res4.status}, Stdout: ${res4.stdout}, Stderr: ${res4.stderr}\n`);
    process.exit(1);
  }

  // Test 5: Path Sum ((TreeNode*, int) -> bool)
  console.log('▶ Test 5: Path Sum ((TreeNode*, int) -> bool)...');
  const cppPathSum = `
class Solution {
public:
    bool hasPathSum(TreeNode* root, int targetSum) {
        if (!root) return false;
        if (!root->left && !root->right) return targetSum == root->val;
        return hasPathSum(root->left, targetSum - root->val) || hasPathSum(root->right, targetSum - root->val);
    }
};
`.trim();

  const res5 = await executeCode({
    language: 'cpp',
    code: cppPathSum,
    stdin: '[5,4,8,11,null,13,4,7,2,null,null,null,1]\n22',
  });
  if (res5.status === 'SUCCESS' && res5.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res5.stdout.trim()} (time: ${res5.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res5.status}, Stdout: ${res5.stdout}, Stderr: ${res5.stderr}\n`);
    process.exit(1);
  }

  // Test 6: Reverse String (vector<char>& in-place void)
  console.log('▶ Test 6: Reverse String (vector<char>& in-place void)...');
  const cppReverseString = `
class Solution {
public:
    void reverseString(vector<char>& s) {
        int i = 0, j = (int)s.size() - 1;
        while (i < j) {
            swap(s[i++], s[j--]);
        }
    }
};
`.trim();

  const res6 = await executeCode({
    language: 'cpp',
    code: cppReverseString,
    stdin: '["h","e","l","l","o"]',
  });
  if (res6.status === 'SUCCESS' && res6.stdout.trim() === '["o","l","l","e","h"]') {
    console.log(`  ✅ PASSED: Output: ${res6.stdout.trim()} (time: ${res6.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res6.status}, Stdout: ${res6.stdout}, Stderr: ${res6.stderr}\n`);
    process.exit(1);
  }

  // Test 7: Generate Parentheses (int -> vector<string>)
  console.log('▶ Test 7: Generate Parentheses (int -> vector<string>)...');
  const cppGenerateParenthesis = `
class Solution {
public:
    void backtrack(int open, int close, int n, string cur, vector<string>& ans) {
        if (cur.length() == 2 * n) {
            ans.push_back(cur);
            return;
        }
        if (open < n) backtrack(open + 1, close, n, cur + "(", ans);
        if (close < open) backtrack(open, close + 1, n, cur + ")", ans);
    }

    vector<string> generateParenthesis(int n) {
        vector<string> ans;
        backtrack(0, 0, n, "", ans);
        return ans;
    }
};
`.trim();

  const res7 = await executeCode({
    language: 'cpp',
    code: cppGenerateParenthesis,
    stdin: '3',
  });
  if (res7.status === 'SUCCESS' && res7.stdout.trim() === '["((()))","(()())","(())()","()(())","()()()"]') {
    console.log(`  ✅ PASSED: Output: ${res7.stdout.trim()} (time: ${res7.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res7.status}, Stdout: ${res7.stdout}, Stderr: ${res7.stderr}\n`);
    process.exit(1);
  }

  // Test 8: Word Break ((string, vector<string>) -> bool)
  console.log('▶ Test 8: Word Break ((string, vector<string>) -> bool)...');
  const cppWordBreak = `
class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        unordered_set<string> dict(wordDict.begin(), wordDict.end());
        vector<bool> dp(s.length() + 1, false);
        dp[0] = true;
        for (size_t i = 1; i <= s.length(); ++i) {
            for (size_t j = 0; j < i; ++j) {
                if (dp[j] && dict.count(s.substr(j, i - j))) {
                    dp[i] = true;
                    break;
                }
            }
        }
        return dp[s.length()];
    }
};
`.trim();

  const res8 = await executeCode({
    language: 'cpp',
    code: cppWordBreak,
    stdin: '"leetcode"\n["leet","code"]',
  });
  if (res8.status === 'SUCCESS' && res8.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res8.stdout.trim()} (time: ${res8.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res8.status}, Stdout: ${res8.stdout}, Stderr: ${res8.stderr}\n`);
    process.exit(1);
  }

  // Test 9: Intersection of Two Arrays ((vector<int>, vector<int>) -> vector<int>)
  console.log('▶ Test 9: Intersection of Two Arrays ((vector<int>, vector<int>) -> vector<int>)...');
  const cppIntersection = `
class Solution {
public:
    vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {
        unordered_set<int> s(nums1.begin(), nums1.end());
        unordered_set<int> resSet;
        for (int x : nums2) {
            if (s.count(x)) resSet.insert(x);
        }
        return vector<int>(resSet.begin(), resSet.end());
    }
};
`.trim();

  const res9 = await executeCode({
    language: 'cpp',
    code: cppIntersection,
    stdin: '[1,2,2,1]\n[2,2]',
  });
  if (res9.status === 'SUCCESS' && res9.stdout.trim() === '[2]') {
    console.log(`  ✅ PASSED: Output: ${res9.stdout.trim()} (time: ${res9.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res9.status}, Stdout: ${res9.stdout}, Stderr: ${res9.stderr}\n`);
    process.exit(1);
  }

  // Test 10: Median of Two Sorted Arrays ((vector<int>, vector<int>) -> double)
  console.log('▶ Test 10: Median of Two Sorted Arrays ((vector<int>, vector<int>) -> double)...');
  const cppMedian = `
class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        vector<int> merged = nums1;
        merged.insert(merged.end(), nums2.begin(), nums2.end());
        sort(merged.begin(), merged.end());
        int n = merged.size();
        if (n % 2 == 1) return merged[n / 2];
        return (merged[n / 2 - 1] + merged[n / 2]) / 2.0;
    }
};
`.trim();

  const res10 = await executeCode({
    language: 'cpp',
    code: cppMedian,
    stdin: '[1,3]\n[2]',
  });
  if (res10.status === 'SUCCESS' && res10.stdout.trim().startsWith('2.00000')) {
    console.log(`  ✅ PASSED: Output: ${res10.stdout.trim()} (time: ${res10.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res10.status}, Stdout: ${res10.stdout}, Stderr: ${res10.stderr}\n`);
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🏁 All 10 Comprehensive Signatures Passed Flawlessly!');
  console.log('=====================================================\n');
}

runComprehensiveTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
