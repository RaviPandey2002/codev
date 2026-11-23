import { DriverMatcher, ParsedMethod } from '../../types.js';

function countStringOccurrences(argsStr: string): number {
  return (argsStr.match(/string/g) || []).length;
}

// 1. String -> Int (e.g. lengthOfLongestSubstring, romanToInt, myAtoi)
export const stringToIntMatcher: DriverMatcher = {
  name: 'string_to_int',
  matches(parsed: ParsedMethod) {
    return (
      (parsed.returnType === 'int' || parsed.returnType === 'size_t') &&
      parsed.argsStr.includes('string') &&
      countStringOccurrences(parsed.argsStr) === 1
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    Solution sol;
    int ans = sol.${parsed.methodName}(s);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 2. String -> Bool (e.g. isValid, isPalindrome)
export const stringToBoolMatcher: DriverMatcher = {
  name: 'string_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('string') &&
      countStringOccurrences(parsed.argsStr) === 1
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    Solution sol;
    bool ans = sol.${parsed.methodName}(s);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 3. String -> String (e.g. longestCommonPrefix, reverseWords)
export const stringToStringMatcher: DriverMatcher = {
  name: 'string_to_string',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'string' &&
      parsed.argsStr.includes('string') &&
      countStringOccurrences(parsed.argsStr) === 1
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    Solution sol;
    std::string ans = sol.${parsed.methodName}(s);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 4. (String, String) -> Bool (e.g. isAnagram)
export const twoStringsToBoolMatcher: DriverMatcher = {
  name: 'two_strings_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('string') &&
      countStringOccurrences(parsed.argsStr) >= 2
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s1, s2;
    if (!std::getline(std::cin, s1)) return 0;
    while (s1.empty() && std::getline(std::cin, s1));
    if (s1.size() >= 2 && s1.front() == '"' && s1.back() == '"') s1 = s1.substr(1, s1.size() - 2);

    if (!std::getline(std::cin, s2)) return 0;
    while (s2.empty() && std::getline(std::cin, s2));
    if (s2.size() >= 2 && s2.front() == '"' && s2.back() == '"') s2 = s2.substr(1, s2.size() - 2);

    Solution sol;
    bool ans = sol.${parsed.methodName}(s1, s2);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 5. (String, String) -> Int (e.g. strStr)
export const twoStringsToIntMatcher: DriverMatcher = {
  name: 'two_strings_to_int',
  matches(parsed: ParsedMethod) {
    return (
      (parsed.returnType === 'int' || parsed.returnType === 'size_t') &&
      parsed.argsStr.includes('string') &&
      countStringOccurrences(parsed.argsStr) >= 2
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s1, s2;
    if (!std::getline(std::cin, s1)) return 0;
    while (s1.empty() && std::getline(std::cin, s1));
    if (s1.size() >= 2 && s1.front() == '"' && s1.back() == '"') s1 = s1.substr(1, s1.size() - 2);

    if (!std::getline(std::cin, s2)) return 0;
    while (s2.empty() && std::getline(std::cin, s2));
    if (s2.size() >= 2 && s2.front() == '"' && s2.back() == '"') s2 = s2.substr(1, s2.size() - 2);

    Solution sol;
    int ans = sol.${parsed.methodName}(s1, s2);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 6. (String, String) -> String (e.g. addStrings)
export const twoStringsToStringMatcher: DriverMatcher = {
  name: 'two_strings_to_string',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'string' &&
      parsed.argsStr.includes('string') &&
      countStringOccurrences(parsed.argsStr) >= 2
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s1, s2;
    if (!std::getline(std::cin, s1)) return 0;
    while (s1.empty() && std::getline(std::cin, s1));
    if (s1.size() >= 2 && s1.front() == '"' && s1.back() == '"') s1 = s1.substr(1, s1.size() - 2);

    if (!std::getline(std::cin, s2)) return 0;
    while (s2.empty() && std::getline(std::cin, s2));
    if (s2.size() >= 2 && s2.front() == '"' && s2.back() == '"') s2 = s2.substr(1, s2.size() - 2);

    Solution sol;
    std::string ans = sol.${parsed.methodName}(s1, s2);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

export const stringMatchers: DriverMatcher[] = [
  stringToIntMatcher,
  stringToBoolMatcher,
  stringToStringMatcher,
  twoStringsToBoolMatcher,
  twoStringsToIntMatcher,
  twoStringsToStringMatcher,
];
