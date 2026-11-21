import { executeCode } from '../services/execution.service';

/**
 * Step 1d: LeetCode String Method Runner Verification
 *
 * Verifies that:
 * 1. int lengthOfLongestSubstring(string s) parses `"abcabcbb"` and outputs 3.
 * 2. bool isValid(string s) parses `"()[]{}"` and outputs true.
 * 3. bool isAnagram(string s, string t) parses `"anagram"\n"nagaram"` and outputs true.
 */

async function runStringHarnessTest() {
  console.log('=====================================================');
  console.log('🧪 Running LeetCode String Method Runner Test');
  console.log('=====================================================\n');

  // 1. User's exact code from Screenshot 2!
  const cppLongestSubstring = `
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> a(128, 0);
        int i = 0, j = 0;
        int ans = 0;
        if (s == "") return 0;
        while (j < s.size()) {
            int idx = int(s[j]);
            if (a[idx] == 1) {
                a[int(s[i])] = 0;
                i++;
            } else {
                ans = max(ans, (j - i + 1));
                a[int(s[j])] = 1;
                j++;
            }
        }
        return ans;
    }
};
`.trim();

  // 2. Valid Parentheses
  const cppValidParentheses = `
class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') st.push(c);
            else {
                if (st.empty()) return false;
                if (c == ')' && st.top() != '(') return false;
                if (c == '}' && st.top() != '{') return false;
                if (c == ']' && st.top() != '[') return false;
                st.pop();
            }
        }
        return st.empty();
    }
};
`.trim();

  // 3. Valid Anagram
  const cppIsAnagram = `
class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        vector<int> count(26, 0);
        for (char c : s) count[c - 'a']++;
        for (char c : t) count[c - 'a']--;
        for (int x : count) if (x != 0) return false;
        return true;
    }
};
`.trim();

  // 4. Find the Index of the First Occurrence in a String (strStr)
  const cppStrStr = `
class Solution {
public:
    int strStr(string haystack, string needle) {
        auto pos = haystack.find(needle);
        return pos == string::npos ? -1 : (int)pos;
    }
};
`.trim();

  // 5. Longest Common Prefix
  const cppLongestCommonPrefix = `
class Solution {
public:
    string longestCommonPrefix(string s) {
        return s;
    }
};
`.trim();

  // Test 1: Length of Longest Substring
  console.log('▶ Test 1: Length of Longest Substring (User Screenshot 2: "abcabcbb" -> 3)...');
  const res1 = await executeCode({
    language: 'cpp',
    code: cppLongestSubstring,
    stdin: '"abcabcbb"',
  });
  if (res1.status === 'SUCCESS' && res1.stdout.trim() === '3') {
    console.log(`  ✅ PASSED: Output: ${res1.stdout.trim()} (time: ${res1.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res1.status}, Stdout: ${res1.stdout}, Stderr: ${res1.stderr}\n`);
    process.exit(1);
  }

  // Test 2: Valid Parentheses
  console.log('▶ Test 2: Valid Parentheses ("()[]{}" -> true)...');
  const res2 = await executeCode({
    language: 'cpp',
    code: cppValidParentheses,
    stdin: '"()[]{}"',
  });
  if (res2.status === 'SUCCESS' && res2.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res2.stdout.trim()} (time: ${res2.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res2.status}, Stdout: ${res2.stdout}, Stderr: ${res2.stderr}\n`);
    process.exit(1);
  }

  // Test 3: Valid Anagram
  console.log('▶ Test 3: Valid Anagram ("anagram" / "nagaram" -> true)...');
  const res3 = await executeCode({
    language: 'cpp',
    code: cppIsAnagram,
    stdin: '"anagram"\n"nagaram"',
  });
  if (res3.status === 'SUCCESS' && res3.stdout.trim() === 'true') {
    console.log(`  ✅ PASSED: Output: ${res3.stdout.trim()} (time: ${res3.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res3.status}, Stdout: ${res3.stdout}, Stderr: ${res3.stderr}\n`);
    process.exit(1);
  }

  // Test 4: strStr
  console.log('▶ Test 4: strStr ("sadbutsad" / "sad" -> 0)...');
  const res4 = await executeCode({
    language: 'cpp',
    code: cppStrStr,
    stdin: '"sadbutsad"\n"sad"',
  });
  if (res4.status === 'SUCCESS' && res4.stdout.trim() === '0') {
    console.log(`  ✅ PASSED: Output: ${res4.stdout.trim()} (time: ${res4.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res4.status}, Stdout: ${res4.stdout}, Stderr: ${res4.stderr}\n`);
    process.exit(1);
  }

  // Test 5: string -> string
  console.log('▶ Test 5: String Echo ("flower" -> flower)...');
  const res5 = await executeCode({
    language: 'cpp',
    code: cppLongestCommonPrefix,
    stdin: '"flower"',
  });
  if (res5.status === 'SUCCESS' && res5.stdout.trim() === 'flower') {
    console.log(`  ✅ PASSED: Output: ${res5.stdout.trim()} (time: ${res5.executionTimeMs}ms)\n`);
  } else {
    console.error(`  ❌ FAILED: Status: ${res5.status}, Stdout: ${res5.stdout}, Stderr: ${res5.stderr}\n`);
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🏁 All String Method Runner Tests Passed!');
  console.log('=====================================================');
}

runStringHarnessTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
