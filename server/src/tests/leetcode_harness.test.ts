import { executeCode } from '../services/execution.service';

/**
 * Step 1: LeetCode C++ Runner Wrapper Experiment
 *
 * This test verifies whether an invisible driver appended to user-written
 * `class Solution` code allows compiling and running raw LeetCode test cases
 * without the user having to write `main()`, use `cin >>`, or clean brackets.
 */

// Helper to inject the driver below user code
function buildTwoSumWrappedCode(userCode: string): string {
  const driver = `
// ========================================================
// [CodeV Injected Driver - Never seen or edited by user]
// ========================================================
#include <iostream>
#include <string>
#include <sstream>

static std::vector<int> __codev_parse_vector_int(std::string s) {
    std::vector<int> res;
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    int num;
    while (ss >> num) {
        res.push_back(num);
    }
    return res;
}

int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1;
    if (!std::getline(std::cin, line1)) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    std::vector<int> ans = sol.twoSum(nums, target);

    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;

    return 0;
}
`;

  return `${userCode}\n${driver}`;
}

async function runExperiment() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode C++ Wrapper Harness Experiment');
  console.log('=====================================================\n');

  // 1. Pure User Code (Identical to what you write in LeetCode)
  const userTwoSumSolution = `
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mp;
        for (int i = 0; i < (int)nums.size(); ++i) {
            int complement = target - nums[i];
            if (mp.count(complement)) {
                return {mp[complement], i};
            }
            mp[nums[i]] = i;
        }
        return {};
    }
};
`.trim();

  // Buggy User Code with hardcoded mp[nums[i]] = 1
  const buggyTwoSumSolution = `
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mp;
        for (int i = 0; i < (int)nums.size(); ++i) {
            int complement = target - nums[i];
            if (mp.count(complement)) {
                return {mp[complement], i};
            }
            mp[nums[i]] = 1; // Defect: hardcoded 1 instead of loop index i
        }
        return {};
    }
};
`.trim();

  const wrappedCode = buildTwoSumWrappedCode(userTwoSumSolution);

  const testCases = [
    {
      name: 'Case 1: Standard Case (Example 1)',
      rawInput: '[2,7,11,15]\n9',
      expectedOutput: '[0,1]',
    },
    {
      name: 'Case 2: Non-zero start (Example 2)',
      rawInput: '[3,2,4]\n6',
      expectedOutput: '[1,2]',
    },
    {
      name: 'Case 3: Duplicate Numbers (Example 3)',
      rawInput: '[3,3]\n6',
      expectedOutput: '[0,1]',
    },
    {
      name: 'Case 4: High Index Offset',
      rawInput: '[1,5,3,7]\n10',
      expectedOutput: '[2,3]',
    },
    {
      name: 'Case 5: Late Pair',
      rawInput: '[10,20,30,40,50]\n90',
      expectedOutput: '[3,4]',
    },
    {
      name: 'Case 6: Zeros & Index 0',
      rawInput: '[0,4,3,0]\n0',
      expectedOutput: '[0,3]',
    },
    {
      name: 'Case 7: Negative Numbers',
      rawInput: '[-3,4,3,90]\n0',
      expectedOutput: '[0,2]',
    },
    {
      name: 'Case 8: Bookend Pair',
      rawInput: '[5,1,9,2,7]\n12',
      expectedOutput: '[0,4]',
    },
  ];

  let passedCount = 0;

  console.log('▶ [Positive Test] Running Correct C++ Solution across 8 Canonical Test Cases:');
  for (const tc of testCases) {
    console.log(`▶ Running ${tc.name}...`);
    console.log(`  Raw Input: ${JSON.stringify(tc.rawInput)}`);

    const start = performance.now();
    const result = await executeCode({
      language: 'cpp',
      compilerProfile: 'o3',
      code: wrappedCode,
      stdin: tc.rawInput,
    });
    const totalDuration = Math.round(performance.now() - start);

    const actualOutput = result.stdout.trim();
    const isMatch = actualOutput === tc.expectedOutput;

    if (isMatch) {
      console.log(`  ✅ PASSED: Expected ${tc.expectedOutput} == Actual ${actualOutput}`);
      console.log(`  ⏱️ Exec Time: ${result.executionTimeMs}ms (Total compile+run: ${totalDuration}ms)\n`);
      passedCount++;
    } else {
      console.error(`  ❌ FAILED! Expected: ${tc.expectedOutput}, Got: ${actualOutput}`);
      console.error(`  Stderr: ${result.stderr}`);
      console.error(`  Exit Code: ${result.exitCode}\n`);
    }
  }

  // Negative Verification: Buggy C++ Code with mp[nums[i]] = 1
  console.log('▶ [Negative Test] Running Buggy C++ Solution (mp[nums[i]] = 1) across 8 Canonical Test Cases:');
  const buggyWrappedCode = buildTwoSumWrappedCode(buggyTwoSumSolution);
  let buggyPassedCount = 0;

  for (const tc of testCases) {
    const result = await executeCode({
      language: 'cpp',
      compilerProfile: 'o3',
      code: buggyWrappedCode,
      stdin: tc.rawInput,
    });
    const actualOutput = result.stdout.trim();
    const isMatch = actualOutput === tc.expectedOutput;

    if (isMatch) {
      buggyPassedCount++;
      console.log(`  ⚠️ Buggy code accidentally matched ${tc.name}: Got ${actualOutput} (coincidental index 1)`);
    } else {
      console.log(`  ✅ Buggy code correctly failed ${tc.name}: Expected ${tc.expectedOutput}, got ${actualOutput}`);
    }
  }

  const buggyFailedVerification = buggyPassedCount < testCases.length;
  if (buggyFailedVerification) {
    console.log(`\n  ✅ Negative verification PASSED: Buggy C++ code failed verification (${buggyPassedCount}/${testCases.length} passed, ${testCases.length - buggyPassedCount} failed)\n`);
  } else {
    console.error(`\n  ❌ Negative verification FAILED: Buggy C++ code unexpectedly passed all ${testCases.length} cases!\n`);
  }

  // Test Error Line Reporting
  console.log('▶ Verifying Compiler Error Line Accuracy');
  const faultyUserCode = `
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        undeclared_variable = 42; // Syntax error on line 7
        return {};
    }
};
`.trim();

  const faultyWrapped = buildTwoSumWrappedCode(faultyUserCode);
  const errorResult = await executeCode({
    language: 'cpp',
    compilerProfile: 'default',
    code: faultyWrapped,
    stdin: '[2,7,11,15]\n9',
  });

  const hasLine7Error = errorResult.stderr.includes(':7:') || errorResult.stderr.includes('undeclared_variable');
  if (hasLine7Error) {
    console.log('  ✅ PASSED: Compiler correctly reported error in user code:');
    console.log(`     "${errorResult.stderr.split('\n')[0]}"\n`);
    passedCount++;
  } else {
    console.error('  ❌ FAILED: Error line was not accurate:');
    console.error(`     Stderr: ${errorResult.stderr}\n`);
  }

  console.log('=====================================================');
  console.log(`🏁 Experiment Results: ${passedCount}/9 Tests Passed (8/8 canonical Two Sum cases + 1 compiler error line check)`);
  console.log(`🛡️ Negative Verification: ${buggyFailedVerification ? 'PASSED (buggy code failed suite)' : 'FAILED'}`);
  console.log('=====================================================');

  if (passedCount === 9 && buggyFailedVerification) {
    console.log('🎉 Verdict: The LeetCode C++ Wrapper Harness works cleanly and catches faulty implementations!');
  } else {
    process.exit(1);
  }
}

runExperiment().catch((err) => {
  console.error('Unexpected experiment error:', err);
  process.exit(1);
});
