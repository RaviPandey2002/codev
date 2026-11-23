import type { ProblemData } from '@codev/shared';

/**
 * Safely encodes ProblemData into a UTF-8 Base64 string for URL hash transmission.
 */
export function encodeProblemData(problem: ProblemData): string {
  const json = JSON.stringify(problem);
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Safely decodes an incoming Base64 problem payload into validated ProblemData.
 */
export function decodeProblemData(encoded: string): ProblemData | null {
  try {
    if (!encoded || typeof encoded !== 'string') return null;
    const clean = decodeURIComponent(encoded.trim());
    let json = '';
    if (typeof TextDecoder !== 'undefined') {
      const binary = atob(clean);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    } else {
      json = decodeURIComponent(escape(atob(clean)));
    }

    const data = JSON.parse(json);
    if (
      !data ||
      typeof data !== 'object' ||
      typeof data.title !== 'string' ||
      !data.title.trim() ||
      !data.platform
    ) {
      return null;
    }

    return {
      title: data.title.trim(),
      platform: data.platform,
      url: data.url || undefined,
      contestId: typeof data.contestId === 'number' ? data.contestId : undefined,
      index: data.index || undefined,
      timeLimit: data.timeLimit || undefined,
      memoryLimit: data.memoryLimit || undefined,
      difficulty: data.difficulty || undefined,
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      description: data.description || undefined,
      inputSpecification: data.inputSpecification || undefined,
      outputSpecification: data.outputSpecification || undefined,
      sampleInput: data.sampleInput || undefined,
      sampleOutput: data.sampleOutput || undefined,
      sampleCases: Array.isArray(data.sampleCases) ? data.sampleCases : [],
      codeSnippets: Array.isArray(data.codeSnippets) ? data.codeSnippets : undefined,
    };
  } catch (err) {
    console.error('Failed to decode problem data:', err);
    return null;
  }
}

