import { ParsedMethod, ParsedParam } from '../types.js';

/**
 * Splits parameter strings by commas that are outside angle brackets (<>).
 * Example: "vector<pair<int, int>>& list, int k" -> ["vector<pair<int, int>>& list", "int k"]
 */
export function splitParameters(paramStr: string): string[] {
  const params: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < paramStr.length; i++) {
    const char = paramStr[i];
    if (char === '<') {
      depth++;
      current += char;
    } else if (char === '>') {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) params.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    params.push(current.trim());
  }

  return params;
}

export function parseParam(raw: string): ParsedParam {
  const trimmed = raw.trim();
  // Match: type followed by param name (handles & and * modifiers)
  const match = trimmed.match(/^([\s\S]+?)(?:\s+|[&*]+)([a-zA-Z0-9_]+)$/);
  if (match) {
    return {
      type: match[1].trim().replace(/\s*&$/, ''),
      name: match[2].trim(),
      raw: trimmed,
    };
  }
  return {
    type: trimmed,
    name: '',
    raw: trimmed,
  };
}

/**
 * Robustly parses all public methods from C++ class Solution.
 */
export function parseCppSolutionMethods(code: string): ParsedMethod[] {
  const results: ParsedMethod[] = [];

  // 1. Strip comments
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  // 2. Try scanning within class Solution
  const classMatch = cleaned.match(/class\s+Solution\b[\s\S]*?\{([\s\S]*)\};?/);
  if (classMatch) {
    const classBody = classMatch[1];
    const publicSections = classBody.split(/\bpublic\s*:/);
    if (publicSections.length > 1) {
      for (let i = 1; i < publicSections.length; i++) {
        // Cut off if private: or protected: follows
        const sectionContent = publicSections[i].split(/\b(?:private|protected)\s*:/)[0];
        
        // Find method definitions: return_type name(args) { ...
        const methodRegex = /([a-zA-Z0-9_:<>\s*&]+?)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g;
        let match: RegExpExecArray | null;
        while ((match = methodRegex.exec(sectionContent)) !== null) {
          const rawReturn = match[1].trim();
          const methodName = match[2].trim();
          const argsStr = match[3].trim();

          // Skip constructors or destructors or keywords
          if (methodName === 'Solution' || methodName.startsWith('~') || rawReturn.includes('friend')) {
            continue;
          }

          const returnType = rawReturn
            .replace(/^(?:inline|virtual|static)\s+/, '')
            .replace(/\s*&$/, '')
            .trim();

          const rawParams = splitParameters(argsStr);
          const params = rawParams.map(parseParam);

          results.push({
            returnType,
            methodName,
            params,
            argsStr,
            rawSignature: match[0],
          });
        }
      }
    }
  }

  // 3. Fallback to existing single-pattern regex if class block parsing didn't find any methods
  if (results.length === 0) {
    const fallbackMatch = cleaned.match(
      /(?:public|private|protected)?\s*:\s*([^;{()]+?)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/
    );

    if (fallbackMatch) {
      const rawReturn = fallbackMatch[1].trim();
      const returnType = rawReturn.replace(/^(?:public|private|protected)\s*:\s*/, '').trim();
      const methodName = fallbackMatch[2].trim();
      const argsStr = fallbackMatch[3].trim();
      const rawParams = splitParameters(argsStr);
      const params = rawParams.map(parseParam);

      results.push({
        returnType,
        methodName,
        params,
        argsStr,
        rawSignature: fallbackMatch[0],
      });
    }
  }

  return results;
}

export function parseCppSolutionMethod(code: string): ParsedMethod | null {
  const methods = parseCppSolutionMethods(code);
  return methods.length > 0 ? methods[0] : null;
}
