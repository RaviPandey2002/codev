import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapCompanionPayloadToProblem,
  setLatestCompanionProblem,
  getLatestCompanionProblem,
  type CompanionPayload,
} from '../services/companion_listener.js';

describe('Companion Listener Rich Statements & Metadata', () => {
  it('preserves full rich HTML description, KaTeX formulas, and metadata from custom extension', () => {
    const rawPayload: CompanionPayload = {
      name: '2285E. Arithmetic Subarray',
      group: 'Codeforces - Codeforces Round 1135 (Div. 2)',
      url: 'https://codeforces.com/contest/2285/problem/E',
      interactive: false,
      memoryLimit: '256 megabytes',
      timeLimit: '2.0 seconds',
      description: `
        <div class="problem-statement">
          <p>You are given an array $a$ of $n$ integers ($1 \\le n \\le 2 \\cdot 10^5$).</p>
          <p>An arithmetic progression subarray satisfies $a[j] - a[j-1] = d$.</p>
          <div class="input-specification">
            <p>The first line contains $t$ ($1 \\le t \\le 10^4$) — the number of test cases.</p>
          </div>
        </div>
      `,
      tests: [
        {
          input: '4\n5 1\n1 2 6 4 5',
          output: '5',
        },
        {
          input: '3 1\n1 100000000 2',
          output: '3',
        },
      ],
      difficulty: '1600',
      tags: ['data structures', 'math', 'two pointers'],
      platform: 'CODEFORCES',
    };

    const problem = mapCompanionPayloadToProblem(rawPayload);

    assert.equal(problem.title, '2285E. Arithmetic Subarray');
    assert.equal(problem.platform, 'CODEFORCES');
    assert.equal(problem.timeLimit, '2.0 seconds');
    assert.equal(problem.memoryLimit, '256 megabytes');
    assert.equal(problem.difficulty, '1600');
    assert.deepEqual(problem.tags, ['data structures', 'math', 'two pointers']);

    // Critical assertion: Description MUST contain the full HTML story and math formulas, NOT just the 1-line fallback!
    assert.ok(problem.description);
    assert.ok(problem.description.includes('You are given an array $a$ of $n$ integers'));
    assert.ok(problem.description.includes('The first line contains $t$'));
    assert.ok(!problem.description.startsWith('Imported via Competitive Companion'));

    // Test cases assertion
    assert.equal(problem.sampleCases?.length, 2);
    assert.equal(problem.sampleCases[0].input, '4\n5 1\n1 2 6 4 5');
    assert.equal(problem.sampleCases[0].output, '5');
    assert.equal(problem.sampleInput, '4\n5 1\n1 2 6 4 5');
    assert.equal(problem.sampleOutput, '5');
  });

  it('correctly handles MathJax sanitization without character duplication', () => {
    const rawWithMathJax = `
      <p>There are <span class="tex-span"><span class="MathJax_Preview" style="display: none;">n</span><span class="MathJax"><i>n</i></span><span class="MathJax_Assistive_MathML">n</span></span> cities.</p>
    `;

    // Regex used in cleanProblemHtml
    const cleaned = rawWithMathJax.replace(
      /<span[^>]*class="[^"]*(?:MathJax_Preview|MJX_Assistive_MathML|MathJax_Assistive_MathML)[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
      ''
    );

    assert.ok(cleaned.includes('<span class="MathJax"><i>n</i></span>'));
    assert.ok(!cleaned.includes('MathJax_Preview'));
    assert.ok(!cleaned.includes('MathJax_Assistive_MathML'));
  });

  it('gracefully falls back to summary string when description is missing (legacy Competitive Companion)', () => {
    const legacyPayload: CompanionPayload = {
      name: 'E. Arithmetic Subarray',
      group: 'Codeforces - Codeforces Round 1135 (Div. 2)',
      url: 'https://codeforces.com/contest/2285/problem/E',
      timeLimit: 2000,
      memoryLimit: 256,
      tests: [{ input: '1\n2', output: '2' }],
    };

    const problem = mapCompanionPayloadToProblem(legacyPayload);
    assert.equal(problem.title, 'E. Arithmetic Subarray');
    assert.equal(problem.timeLimit, '2 seconds');
    assert.equal(problem.memoryLimit, '256 megabytes');
    assert.equal(
      problem.description,
      'Imported via Competitive Companion from Codeforces - Codeforces Round 1135 (Div. 2).'
    );
    assert.equal(problem.sampleCases?.length, 1);
  });

  it('stores and retrieves latest problem in memory queue', () => {
    const beforeTime = Date.now() - 10;
    const problem = mapCompanionPayloadToProblem({
      name: 'Custom CF Problem',
      tests: [{ input: '10', output: '20' }],
      description: '<p>Solve this puzzle</p>',
    });

    setLatestCompanionProblem(problem);

    const latest = getLatestCompanionProblem(beforeTime);
    assert.ok(latest);
    assert.equal(latest.problem.title, 'Custom CF Problem');
    assert.equal(latest.problem.description, '<p>Solve this puzzle</p>');
    assert.ok(latest.timestamp >= beforeTime);

    // After timestamp returns null
    const noNewProblem = getLatestCompanionProblem(Date.now() + 5000);
    assert.equal(noNewProblem, null);
  });
});
