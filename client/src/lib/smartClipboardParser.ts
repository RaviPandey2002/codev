import type { ProblemData, TestCase } from '@codev/shared';

export interface ParsedClipboardProblem {
  success: boolean;
  problem?: ProblemData;
  error?: string;
}

function cleanCaseContent(text: string): string {
  return text
    .replace(/^Copy\s*/i, '')
    .replace(/^\s*input\s*/i, '')
    .replace(/^\s*output\s*/i, '')
    .trim();
}

/**
 * Intelligent parser that extracts ProblemData from raw copied text from
 * Codeforces, LeetCode, AtCoder, or custom competitive programming problem pages.
 */
export function parseProblemFromClipboard(rawText: string): ParsedClipboardProblem {
  const text = (rawText || '').trim();
  if (!text) {
    return { success: false, error: 'Clipboard text is empty' };
  }

  // 1. Detect Title
  let title = '';
  // Pattern A: "E. Arithmetic Subarray" or "2285E. Arithmetic Subarray"
  const cfTitleMatch = text.match(/^[ \t]*([A-Z0-9]+[.-]?\s+[^\r\n]{2,80})/m);
  if (cfTitleMatch && !/^(input|output|example|sample|note|constraints)/i.test(cfTitleMatch[1])) {
    title = cfTitleMatch[1].trim();
  }

  // Pattern B: LeetCode title like "1. Two Sum"
  if (!title) {
    const lcTitleMatch = text.match(/^[ \t]*(\d+\.\s+[^\r\n]{2,80})/m);
    if (lcTitleMatch) {
      title = lcTitleMatch[1].trim();
    }
  }

  // Fallback title
  if (!title) {
    const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim() || '';
    if (firstLine.length <= 60 && !/^(input|output|example|sample|note|constraints)/i.test(firstLine)) {
      title = firstLine;
    } else {
      title = `Pasted Problem (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    }
  }

  // 2. Detect Time and Memory Limits
  let timeLimit: string | undefined;
  const timeLimitMatch = text.match(/time\s*limit(?:\s*per\s*test)?[:\s]+([0-9.]+\s*(?:seconds?|s|ms))/i);
  if (timeLimitMatch) {
    timeLimit = timeLimitMatch[1].trim();
  }

  let memoryLimit: string | undefined;
  const memLimitMatch = text.match(/memory\s*limit(?:\s*per\s*test)?[:\s]+([0-9.]+\s*(?:megabytes?|mb|gb|bytes))/i);
  if (memLimitMatch) {
    memoryLimit = memLimitMatch[1].trim();
  }

  // 3. Extract Test Cases
  const sampleCases: TestCase[] = [];

  // When an "Example" or "Examples" header is present, scan for testcases from that section forward
  // to avoid confusing the "Input Specification" paragraph with an example case.
  const exampleSectionIdx = text.search(/\b(?:Examples?|Sample\s*Tests?)\b/i);
  const textToScan = exampleSectionIdx !== -1 ? text.substring(exampleSectionIdx) : text;

  const inputBlocks: string[] = [];
  const outputBlocks: string[] = [];
  const lines = textToScan.split(/\r?\n/);
  let currentMode: 'NONE' | 'INPUT' | 'OUTPUT' = 'NONE';
  let currentBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isInputHeader = /^(?:Examples?\s+)?input$/i.test(trimmed) || /^sample\s+input(?:\s*\d+)?$/i.test(trimmed);
    const isOutputHeader = /^output$/i.test(trimmed) || /^sample\s+output(?:\s*\d+)?$/i.test(trimmed);

    if (isInputHeader) {
      if (currentMode === 'INPUT') {
        inputBlocks.push(currentBuffer.join('\n'));
      } else if (currentMode === 'OUTPUT') {
        outputBlocks.push(currentBuffer.join('\n'));
      }
      currentMode = 'INPUT';
      currentBuffer = [];
      continue;
    }

    if (isOutputHeader) {
      if (currentMode === 'INPUT') {
        inputBlocks.push(currentBuffer.join('\n'));
      } else if (currentMode === 'OUTPUT') {
        outputBlocks.push(currentBuffer.join('\n'));
      }
      currentMode = 'OUTPUT';
      currentBuffer = [];
      continue;
    }

    if (currentMode === 'OUTPUT' && /^(?:Note|Notes|Explanation|Constraints|Hint)/i.test(trimmed)) {
      outputBlocks.push(currentBuffer.join('\n'));
      currentMode = 'NONE';
      currentBuffer = [];
      continue;
    }

    if (currentMode !== 'NONE') {
      currentBuffer.push(line);
    }
  }

  if (currentMode === 'INPUT') {
    inputBlocks.push(currentBuffer.join('\n'));
  } else if (currentMode === 'OUTPUT') {
    outputBlocks.push(currentBuffer.join('\n'));
  }

  const pairCount = Math.max(inputBlocks.length, outputBlocks.length);
  for (let i = 0; i < pairCount; i++) {
    const inText = cleanCaseContent(inputBlocks[i] || '');
    const outText = cleanCaseContent(outputBlocks[i] || '');
    if (inText || outText) {
      sampleCases.push({
        input: inText,
        output: outText,
      });
    }
  }

  // Strategy B: LeetCode "Example X: Input: ... Output: ..." format
  if (sampleCases.length === 0) {
    const leetcodeExampleRegex = /Input:\s*([\s\S]*?)\s*Output:\s*([\s\S]*?)(?:Explanation:|\n\n[A-Z]|$)/gi;
    let match: RegExpExecArray | null;
    while ((match = leetcodeExampleRegex.exec(text)) !== null) {
      const inText = match[1]?.trim() || '';
      const outText = match[2]?.trim() || '';
      if (inText) {
        sampleCases.push({
          input: inText,
          output: outText,
        });
      }
    }
  }

  // Strategy C: Fallback to input/output divider
  if (sampleCases.length === 0) {
    const splitMatch = text.search(/\b(?:output|expected)\b/i);
    if (splitMatch !== -1) {
      const rawIn = text.substring(0, splitMatch).replace(/\b(?:input|sample\s+input)\b/i, '').trim();
      const rawOut = text.substring(splitMatch).replace(/\b(?:output|expected)\b/i, '').trim();
      sampleCases.push({
        input: rawIn,
        output: rawOut,
      });
    } else {
      sampleCases.push({
        input: text,
        output: '',
      });
    }
  }

  const problemData: ProblemData = {
    title,
    platform: text.includes('leetcode.com') ? 'LEETCODE' : 'CODEFORCES',
    timeLimit,
    memoryLimit,
    description: text,
    sampleCases,
    sampleInput: sampleCases[0]?.input || '',
    sampleOutput: sampleCases[0]?.output || '',
  };

  return {
    success: true,
    problem: problemData,
  };
}
