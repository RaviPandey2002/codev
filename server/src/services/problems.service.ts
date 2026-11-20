import { AppError } from '../utils/errors';
import type { ImportProblemInput, ProblemData } from '@codev/shared';

interface LeetCodeGraphQLResponse {
  data?: {
    question?: {
      questionFrontendId: string;
      title: string;
      content: string;
      difficulty: string;
      exampleTestcaseList?: string[];
      topicTags?: Array<{ name: string }>;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

interface CodeforcesApiResponse {
  status: string;
  comment?: string;
  result?: {
    problems: Array<{
      contestId: number;
      index: string;
      name: string;
      type: string;
      tags: string[];
    }>;
  };
}

export async function importProblem(input: ImportProblemInput): Promise<ProblemData> {
  const trimmed = input.urlOrId.trim();

  // 1. Check for LeetCode
  const isLeetCode =
    input.platform === 'LEETCODE' ||
    trimmed.includes('leetcode.com') ||
    (!trimmed.match(/^\d+[A-Za-z]/) && !trimmed.includes('codeforces'));

  if (isLeetCode && (trimmed.includes('leetcode.com') || input.platform === 'LEETCODE')) {
    let slug = trimmed;
    const match = trimmed.match(/leetcode\.com\/problems\/([^/?#]+)/);
    if (match?.[1]) {
      slug = match[1];
    } else {
      // Remove any trailing slashes or query parameters
      slug = slug.replace(/^https?:\/\/[^/]+\//, '').replace(/\/.*$/, '').trim();
    }

    try {
      const resp = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodeV/1.0 (Multiplayer CP Arena)',
        },
        body: JSON.stringify({
          query: `query getQuestionDetail($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionFrontendId
              title
              content
              difficulty
              exampleTestcaseList
              topicTags { name }
            }
          }`,
          variables: { titleSlug: slug },
        }),
      });

      if (!resp.ok) {
        throw new AppError(`LeetCode API returned HTTP ${resp.status}`, 502, 'IMPORT_FAILED');
      }

      const json = (await resp.json()) as LeetCodeGraphQLResponse;
      const q = json.data?.question;
      if (!q) {
        throw new AppError(
          `Problem '${slug}' not found on LeetCode. Please check the slug or URL.`,
          404,
          'PROBLEM_NOT_FOUND'
        );
      }

      // Clean HTML tags for summary or display
      const cleanDesc = q.content || '';
      const rawInputs = q.exampleTestcaseList || [];
      const extractedOutputs = [
        ...cleanDesc.matchAll(/<strong>Output:<\/strong>\s*(?:<code>)?([^<]+)/gi),
      ].map((m) => m[1]?.trim() || '');

      const sampleCases = rawInputs.map((input, idx) => ({
        input,
        output: extractedOutputs[idx] || '',
      }));

      return {
        title: `${q.questionFrontendId}. ${q.title}`,
        platform: 'LEETCODE',
        url: `https://leetcode.com/problems/${slug}/`,
        difficulty: q.difficulty,
        tags: q.topicTags?.map((t) => t.name) || [],
        description: cleanDesc,
        sampleInput: sampleCases[0]?.input || '',
        sampleOutput: sampleCases[0]?.output || '',
        sampleCases,
        timeLimit: '2.0 seconds',
        memoryLimit: '256 megabytes',
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Failed to import LeetCode problem: ${err?.message || String(err)}`,
        500,
        'IMPORT_ERROR'
      );
    }
  }

  // 2. Codeforces
  // Extract contest ID and problem index from URL or shorthand (e.g. "2290/H", "2290H", "contest/2290/problem/H")
  let contestId: number | null = null;
  let index: string | null = null;

  const cfUrlMatch = trimmed.match(/(?:contest|problemset\/problem)\/(\d+)\/([A-Za-z0-9]+)/i);
  if (cfUrlMatch?.[1] && cfUrlMatch?.[2]) {
    contestId = parseInt(cfUrlMatch[1], 10);
    index = cfUrlMatch[2].toUpperCase();
  } else {
    const shorthandMatch = trimmed.match(/^(\d+)\s*[/_-]?\s*([A-Za-z0-9]+)$/);
    if (shorthandMatch?.[1] && shorthandMatch?.[2]) {
      contestId = parseInt(shorthandMatch[1], 10);
      index = shorthandMatch[2].toUpperCase();
    }
  }

  if (!contestId || !index) {
    throw new AppError(
      'Could not parse problem reference. Enter a valid Codeforces URL (e.g. https://codeforces.com/contest/2290/problem/H) or ID (e.g. 2290H), or a LeetCode URL.',
      400,
      'INVALID_PROBLEM_FORMAT'
    );
  }

  try {
    const resp = await fetch('https://codeforces.com/api/problemset.problems', {
      headers: {
        'User-Agent': 'CodeV/1.0 (Multiplayer CP Arena)',
      },
    });

    if (!resp.ok) {
      throw new AppError(`Codeforces API returned HTTP ${resp.status}`, 502, 'IMPORT_FAILED');
    }

    const json = (await resp.json()) as CodeforcesApiResponse;
    if (json.status !== 'OK' || !json.result) {
      throw new AppError(json.comment || 'Codeforces API error', 502, 'IMPORT_FAILED');
    }

    const found = json.result.problems.find(
      (p) => p.contestId === contestId && p.index.toUpperCase() === index
    );

    if (!found) {
      throw new AppError(
        `Problem ${contestId}${index} not found on Codeforces problemset.`,
        404,
        'PROBLEM_NOT_FOUND'
      );
    }

    return {
      title: `${found.index}. ${found.name}`,
      platform: 'CODEFORCES',
      url: `https://codeforces.com/contest/${contestId}/problem/${found.index}`,
      contestId,
      index: found.index,
      timeLimit: '2.0 seconds',
      memoryLimit: '256 megabytes',
      tags: found.tags,
      description: `Problem ${found.index} (${found.name}) from Codeforces Contest ${contestId}.\n\nNote: Because Codeforces statement pages are protected by Cloudflare bot verification, you can view the full problem description at:\n${found.contestId ? `https://codeforces.com/contest/${contestId}/problem/${found.index}` : ''}\n\nUse the "Paste Sample" button below or copy-paste testcase input and expected output directly into the I/O panel.`,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Failed to import Codeforces problem: ${err?.message || String(err)}`,
      500,
      'IMPORT_ERROR'
    );
  }
}
