import { buildCppHeaders } from './headers.js';
import { CPP_HELPER_FUNCTIONS } from './helpers.js';
import { parseCppSolutionMethods } from './signature_parser.js';
import { ALL_CPP_MATCHERS, getFallbackDriver } from './registry.js';

export function injectLeetCodeCppDriver(code: string): string {
  // If user already defined main(), don't inject
  if (/\bint\s+main\s*\(/.test(code)) return code;
  if (!/class\s+Solution\b/.test(code)) return code;

  const header = buildCppHeaders(code);
  const candidateMethods = parseCppSolutionMethods(code);

  let driver = '';
  if (candidateMethods.length > 0) {
    // 1. Try to find a method that matches one of our known matchers
    for (const method of candidateMethods) {
      for (const matcher of ALL_CPP_MATCHERS) {
        if (matcher.matches(method)) {
          driver = matcher.generate(method, CPP_HELPER_FUNCTIONS);
          break;
        }
      }
      if (driver) break;
    }
  }

  if (!driver) {
    driver = getFallbackDriver();
  }

  return `${header}\n#line 1 "main.cpp"\n${code}\n${driver}`;
}
