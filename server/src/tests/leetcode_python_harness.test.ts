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

  // 2. Palindrome Number in Python (returns bool)
  const pythonIsPalindrome = `
class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0:
            return False
        s = str(x)
        return s == s[::-1]
`.trim();

  const tests = [
    {
      code: pythonTwoSum,
      name: 'Python Two Sum: Example 1',
      input: '[2,7,11,15]\n9',
      expected: '[0,1]',
    },
    {
      code: pythonTwoSum,
      name: 'Python Two Sum: Example 2',
      input: '[3,2,4]\n6',
      expected: '[1,2]',
    },
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

  for (const test of tests) {
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

  console.log(`Summary: ${passedCount}/${tests.length} tests passed.`);
  if (passedCount !== tests.length) {
    process.exit(1);
  }
}

runPythonHarnessTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
