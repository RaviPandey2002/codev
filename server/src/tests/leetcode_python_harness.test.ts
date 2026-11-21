import { executeCode } from '../services/execution.service';

/**
 * Step 1b: LeetCode Python Runner Harness Verification
 *
 * Verifies that standard Python `class Solution` code without `__main__`
 * or typing imports executes correctly against raw JSON bracketed inputs
 * and returns standard LeetCode outputs.
 */

async function runPythonHarnessTest() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode Python Wrapper Harness Test');
  console.log('=====================================================\n');

  // 1. Two Sum in Python (uses List[int] from typing without explicit import)
  const pythonTwoSum = `
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`.trim();

  // Buggy Python Two Sum with seen[num] = 1 (constant map value)
  const buggyPythonTwoSum = `
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = 1
        return []
`.trim();

  // 2. Palindrome Number in Python (returns bool)
  const pythonIsPalindrome = `
class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        s = str(x)
        return s == s[::-1]
`.trim();

  const canonicalTwoSumCases = [
    {
      name: 'Case 1: Standard Case (Example 1)',
      input: '[2,7,11,15]\n9',
      expected: '[0,1]',
    },
    {
      name: 'Case 2: Non-zero start (Example 2)',
      input: '[3,2,4]\n6',
      expected: '[1,2]',
    },
    {
      name: 'Case 3: Duplicate Numbers (Example 3)',
      input: '[3,3]\n6',
      expected: '[0,1]',
    },
    {
      name: 'Case 4: High Index Offset',
      input: '[1,5,3,7]\n10',
      expected: '[2,3]',
    },
    {
      name: 'Case 5: Late Pair',
      input: '[10,20,30,40,50]\n90',
      expected: '[3,4]',
    },
    {
      name: 'Case 6: Zeros & Index 0',
      input: '[0,4,3,0]\n0',
      expected: '[0,3]',
    },
    {
      name: 'Case 7: Negative Numbers',
      input: '[-3,4,3,90]\n0',
      expected: '[0,2]',
    },
    {
      name: 'Case 8: Bookend Pair',
      input: '[5,1,9,2,7]\n12',
      expected: '[0,4]',
    },
  ];

  const palindromeTests = [
    {
      code: pythonIsPalindrome,
      name: 'Python Palindrome: True Case',
      input: '121',
      expected: 'true',
    },
    {
      code: pythonIsPalindrome,
      name: 'Python Palindrome: False Negative Case',
      input: '-121',
      expected: 'false',
    },
  ];

  let passedCount = 0;

  // Phase 1: Positive verification of correct Python Two Sum on 8 canonical test cases
  console.log('▶ [Positive Test] Running Correct Python Two Sum across 8 Canonical Test Cases:');
  for (const tc of canonicalTwoSumCases) {
    const res = await executeCode({
      language: 'python',
      code: pythonTwoSum,
      stdin: tc.input,
    });

    const actual = res.stdout.trim();
    const passed = res.status === 'SUCCESS' && actual === tc.expected;

    if (passed) {
      console.log(`✅ [PASS] Python Two Sum - ${tc.name}`);
      console.log(`   Output: ${actual} (time: ${res.executionTimeMs}ms)\n`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] Python Two Sum - ${tc.name}`);
      console.error(`   Status:   ${res.status}`);
      console.error(`   Expected: ${tc.expected}`);
      console.error(`   Actual:   ${actual}`);
      console.error(`   Stderr:   ${res.stderr}\n`);
    }
  }

  // Phase 2: Negative verification of buggy Python Two Sum (seen[num] = 1) on 8 canonical cases
  console.log('▶ [Negative Test] Running Buggy Python Two Sum (seen[num] = 1) across 8 Canonical Test Cases:');
  let buggyPassedCount = 0;
  for (const tc of canonicalTwoSumCases) {
    const res = await executeCode({
      language: 'python',
      code: buggyPythonTwoSum,
      stdin: tc.input,
    });

    const actual = res.stdout.trim();
    const isMatch = actual === tc.expected;

    if (isMatch) {
      buggyPassedCount++;
      console.log(`⚠️ Buggy Python code accidentally matched ${tc.name}: Got ${actual} (coincidental index 1)`);
    } else {
      console.log(`✅ Buggy Python code correctly failed ${tc.name}: Expected ${tc.expected}, got ${actual}`);
    }
  }

  const buggyFailedVerification = buggyPassedCount < canonicalTwoSumCases.length;
  if (buggyFailedVerification) {
    console.log(`\n  ✅ Negative verification PASSED: Buggy Python code failed verification (${buggyPassedCount}/${canonicalTwoSumCases.length} passed, ${canonicalTwoSumCases.length - buggyPassedCount} failed)\n`);
  } else {
    console.error(`\n  ❌ Negative verification FAILED: Buggy Python code unexpectedly passed all ${canonicalTwoSumCases.length} cases!\n`);
  }

  // Phase 3: Palindrome Tests
  console.log('▶ Running Python Palindrome Tests:');
  for (const test of palindromeTests) {
    const res = await executeCode({
      language: 'python',
      code: test.code,
      stdin: test.input,
    });

    const actual = res.stdout.trim();
    const passed = res.status === 'SUCCESS' && actual === test.expected;

    if (passed) {
      console.log(`✅ [PASS] ${test.name}`);
      console.log(`   Output: ${actual} (time: ${res.executionTimeMs}ms)\n`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${test.name}`);
      console.error(`   Status:   ${res.status}`);
      console.error(`   Expected: ${test.expected}`);
      console.error(`   Actual:   ${actual}`);
      console.error(`   Stderr:   ${res.stderr}\n`);
    }
  }

  const totalExpectedPassed = canonicalTwoSumCases.length + palindromeTests.length;
  console.log(`=====================================================`);
  console.log(`Summary: ${passedCount}/${totalExpectedPassed} positive tests passed.`);
  console.log(`🛡️ Negative Verification: ${buggyFailedVerification ? 'PASSED (buggy code failed suite)' : 'FAILED'}`);
  console.log(`=====================================================`);

  if (passedCount !== totalExpectedPassed || !buggyFailedVerification) {
    process.exit(1);
  }
}

runPythonHarnessTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
