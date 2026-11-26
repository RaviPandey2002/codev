import type { ArenaPlatform } from '../schemas/rooms';

export interface ProblemKeyInput {
  platform: ArenaPlatform;
  url?: string;
  urlOrId?: string;
  contestId?: number;
  index?: string;
  title: string;
}

function slugifyTitle(title: string): string {
  return title
    .replace(/^\d+[.\-:\s]+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/**
 * Computes a deterministic canonical identifier for a problem across
 * Wishlists, Session Queues, and Imports (e.g. "leetcode:two-sum", "codeforces:2290/H").
 */
export function getCanonicalProblemKey(input: ProblemKeyInput): string {
  const rawUrl = (input.url || input.urlOrId || '').trim();
  const platform = input.platform || 'STANDARD_IO';

  if (platform === 'LEETCODE') {
    const lcMatch = rawUrl.match(/\/problems\/([^/?#]+)/i);
    if (lcMatch?.[1]) {
      return `leetcode:${lcMatch[1].toLowerCase()}`.slice(0, 255);
    }
    const slug = slugifyTitle(input.title || rawUrl);
    return `leetcode:${slug || 'unknown'}`.slice(0, 255);
  }

  if (platform === 'CODEFORCES') {
    if (input.contestId && input.index) {
      return `codeforces:${input.contestId}/${input.index.toUpperCase()}`.slice(0, 255);
    }
    const cfContestMatch = rawUrl.match(
      /\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/i
    );
    if (cfContestMatch?.[1] && cfContestMatch?.[2]) {
      return `codeforces:${cfContestMatch[1]}/${cfContestMatch[2].toUpperCase()}`.slice(0, 255);
    }
    const cfProblemsetMatch = rawUrl.match(
      /\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/i
    );
    if (cfProblemsetMatch?.[1] && cfProblemsetMatch?.[2]) {
      return `codeforces:${cfProblemsetMatch[1]}/${cfProblemsetMatch[2].toUpperCase()}`.slice(0, 255);
    }
    const cfGymMatch = rawUrl.match(/\/gym\/(\d+)\/problem\/([A-Za-z0-9]+)/i);
    if (cfGymMatch?.[1] && cfGymMatch?.[2]) {
      return `codeforces:gym/${cfGymMatch[1]}/${cfGymMatch[2].toUpperCase()}`.slice(0, 255);
    }
    const shorthand = rawUrl.match(/^(\d+)\s*[/_-]?\s*([A-Za-z0-9]+)$/);
    if (shorthand?.[1] && shorthand?.[2]) {
      return `codeforces:${shorthand[1]}/${shorthand[2].toUpperCase()}`.slice(0, 255);
    }
    const slug = slugifyTitle(input.title || rawUrl);
    return `codeforces:${slug || 'unknown'}`.slice(0, 255);
  }

  if (rawUrl) {
    return `${platform.toLowerCase()}:${rawUrl.replace(/\/+$/, '').toLowerCase()}`.slice(0, 255);
  }
  return `${platform.toLowerCase()}:${slugifyTitle(input.title) || 'unknown'}`.slice(0, 255);
}
