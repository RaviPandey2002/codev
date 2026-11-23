import { executeCode } from '../services/execution.service';

/**
 * Step 1c: LeetCode Linked List Harness Verification
 *
 * Verifies that:
 * 1. C++ Add Two Numbers executes with built-in ListNode definition and outputs [7,0,8].
 * 2. Python Add Two Numbers executes and outputs [7,0,8].
 * 3. An unsupported custom signature compiles cleanly and returns the graceful "Coming soon" notice.
 */

async function runLinkedListHarnessTest() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode Linked List & Custom Type Harness Test');
  console.log('=====================================================\n');

  // 1. C++ Add Two Numbers (User's exact code from the prompt!)
  const cppAddTwoNumbers = `
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode* root = new ListNode(0);
        ListNode* ans = root;
        int c = 0, s = 0;
        while (l1 != NULL || l2 != NULL || c != 0) {
            s = 0;
            if (l1 != NULL) {
                s += l1->val;
                l1 = l1->next;
            }
            if (l2 != NULL) {
                s += l2->val;
                l2 = l2->next;
            }
            s += c;

            if (s > 9) {
                c = 1;
                s = s % 10;
            } else {
                c = 0;
            }

            auto x = new ListNode(s);
            root->next = x;
            root = root->next;
        }
        return ans->next;
    }
};
`.trim();

  // 2. Python Add Two Numbers
  const pythonAddTwoNumbers = `
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        curr = dummy
        carry = 0
        while l1 or l2 or carry:
            val1 = l1.val if l1 else 0
            val2 = l2.val if l2 else 0
            total = val1 + val2 + carry
            carry = total // 10
            curr.next = ListNode(total % 10)
            curr = curr.next
            if l1: l1 = l1.next
            if l2: l2 = l2.next
        return dummy.next
`.trim();

  // 3. Unsupported Signature (e.g. complex custom type)
  const cppUnsupportedSignature = `
class Solution {
public:
    void customComplexSignature(map<int, pair<int, string>>& complexMap) {
        // complex custom problem
    }
};
`.trim();

  // Test 1: C++ Add Two Numbers
  console.log('▶ Test 1: C++ Add Two Numbers ([2,4,3] + [5,6,4] -> [7,0,8])...');
  const res1 = await executeCode({
    language: 'cpp',
    code: cppAddTwoNumbers,
    stdin: '[2,4,3]\n[5,6,4]',
  });
  if (res1.status === 'SUCCESS' && res1.stdout.trim() === '[7,0,8]') {
    console.log(`  ✅ PASSED: Output: ${res1.stdout.trim()} (time: ${res1.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res1.status}, Stdout: ${res1.stdout}, Stderr: ${res1.stderr}\n`);
    process.exit(1);
  }

  // Test 2: Python Add Two Numbers
  console.log('▶ Test 2: Python Add Two Numbers ([2,4,3] + [5,6,4] -> [7,0,8])...');
  const res2 = await executeCode({
    language: 'python',
    code: pythonAddTwoNumbers,
    stdin: '[2,4,3]\n[5,6,4]',
  });
  if (res2.status === 'SUCCESS' && res2.stdout.trim() === '[7,0,8]') {
    console.log(`  ✅ PASSED: Output: ${res2.stdout.trim()} (time: ${res2.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res2.status}, Stdout: ${res2.stdout}, Stderr: ${res2.stderr}\n`);
    process.exit(1);
  }

  // Test 3: Graceful Notice for Unsupported Signature
  console.log('▶ Test 3: Unsupported Signature Graceful Notice...');
  const res3 = await executeCode({
    language: 'cpp',
    code: cppUnsupportedSignature,
    stdin: '[["5","3"]]'
  });
  if (res3.status === 'SUCCESS' && res3.stdout.includes('[CodeV Notice] Automatic test runner for this specific signature is coming soon')) {
    console.log(`  ✅ PASSED: Correctly outputted coming soon notice without compile errors!\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res3.status}, Stdout: ${res3.stdout}, Stderr: ${res3.stderr}\n`);
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🏁 All Linked List & Custom Type Harness Tests Passed!');
  console.log('=====================================================');
}

runLinkedListHarnessTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
