import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.js';
import {
  clearCompanionProblemsForTests,
  getLatestCompanionProblem,
  mapCompanionPayloadToProblem,
  type CompanionPayload,
} from '../services/companion_listener.js';

describe('Companion Snippets & Function Signature Enrichment', () => {
  afterEach(() => {
    clearCompanionProblemsForTests();
  });

  it('preserves codeSnippets provided directly by the Chrome extension', async () => {
    await app.ready();

    const sampleSnippets = [
      {
        lang: 'C++',
        langSlug: 'cpp',
        code: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};',
      },
      {
        lang: 'Python3',
        langSlug: 'python3',
        code: 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ',
      },
    ];

    const payload: CompanionPayload = {
      name: '1. Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      platform: 'LEETCODE',
      tests: [{ input: '[2,7,11,15]\n9', output: '[0,1]' }],
      codeSnippets: sampleSnippets,
    };

    const res = await app.inject({
      method: 'POST',
      url: '/problems/companion?roomId=test-room-1',
      payload,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.problem.codeSnippets?.length, 2);
    assert.equal(body.problem.codeSnippets[0].langSlug, 'cpp');
    assert.ok(body.problem.codeSnippets[0].code.includes('vector<int> twoSum'));

    const stored = getLatestCompanionProblem(0, 'test-room-1');
    assert.ok(stored);
    assert.equal(stored.problem.codeSnippets?.length, 2);
  });

  it('automatically enriches missing codeSnippets for LeetCode companion payloads', async () => {
    await app.ready();

    // Payload WITHOUT codeSnippets (e.g. from older extension or Competitive Companion)
    const payload: CompanionPayload = {
      name: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      platform: 'LEETCODE',
      tests: [{ input: '[2,7,11,15]\n9', output: '[0,1]' }],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/problems/companion?roomId=test-room-enrich',
      payload,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);

    // The backend should have enriched codeSnippets using LeetCode GraphQL
    assert.ok(body.problem.codeSnippets, 'codeSnippets should be populated');
    assert.ok(body.problem.codeSnippets.length > 0, 'codeSnippets should not be empty');

    const cppSnippet = body.problem.codeSnippets.find((s: any) => s.langSlug === 'cpp');
    assert.ok(cppSnippet, 'C++ snippet must exist');
    assert.ok(cppSnippet.code.includes('twoSum'), 'C++ snippet must contain the function signature');

    const pySnippet = body.problem.codeSnippets.find((s: any) => s.langSlug === 'python3');
    assert.ok(pySnippet, 'Python3 snippet must exist');
    assert.ok(pySnippet.code.includes('def twoSum'), 'Python3 snippet must contain def twoSum');
  });

  it('mapCompanionPayloadToProblem maps codeSnippets properly', () => {
    const raw: CompanionPayload = {
      name: '3. Longest Substring Without Repeating Characters',
      url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
      codeSnippets: [
        {
          lang: 'C++',
          langSlug: 'cpp',
          code: 'class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};',
        },
      ],
    };

    const prob = mapCompanionPayloadToProblem(raw);
    assert.equal(prob.platform, 'LEETCODE');
    assert.equal(prob.codeSnippets?.length, 1);
    assert.ok(prob.codeSnippets[0].code.includes('lengthOfLongestSubstring'));
  });
});
