import { DriverMatcher, ParsedMethod } from '../../types.js';

function getArgsWithoutVectors(argsStr: string): string {
  return argsStr.replace(/vector\s*<[^>]+>/g, '');
}

function hasStandaloneInt(argsStr: string): boolean {
  return /\b(int|long)\b/.test(getArgsWithoutVectors(argsStr));
}

// 1. 2D Vector Char: in-place void (e.g. solveSudoku)
export const matrixCharInPlaceMatcher: DriverMatcher = {
  name: 'matrix_char_in_place',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'void' &&
      parsed.argsStr.includes('vector<vector<char>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<char>> board = __codev_parse_vector_vector_char(line1);

    Solution sol;
    sol.${parsed.methodName}(board);
    __codev_print_vector_vector_char(board);
    return 0;
}
`;
  },
};

// 2. 2D Vector Char: matrix -> int (e.g. native LeetCode numIslands)
export const matrixCharToIntMatcher: DriverMatcher = {
  name: 'matrix_char_to_int',
  matches(parsed: ParsedMethod) {
    return (
      (parsed.returnType === 'int' || parsed.returnType === 'long long') &&
      parsed.argsStr.includes('vector<vector<char>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<char>> grid = __codev_parse_vector_vector_char(line1);

    Solution sol;
    int ans = sol.${parsed.methodName}(grid);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 3. 2D Vector Char: matrix -> bool (e.g. isValidSudoku)
export const matrixCharToBoolMatcher: DriverMatcher = {
  name: 'matrix_char_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('vector<vector<char>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<char>> board = __codev_parse_vector_vector_char(line1);

    Solution sol;
    bool ans = sol.${parsed.methodName}(board);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 4. 2D Vector Int & Int -> Bool (e.g. searchMatrix / searchMatrix II)
export const matrixAndIntToBoolMatcher: DriverMatcher = {
  name: 'matrix_and_int_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('vector<vector<int>>') &&
      hasStandaloneInt(parsed.argsStr) &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<int>> matrix = __codev_parse_vector_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    bool ans = sol.${parsed.methodName}(matrix, target);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 5. 2D Vector Int: matrix -> int (e.g. numIslands, maxAreaOfIsland, minPathSum)
export const matrixToIntMatcher: DriverMatcher = {
  name: 'matrix_to_int',
  matches(parsed: ParsedMethod) {
    return (
      (parsed.returnType === 'int' || parsed.returnType === 'long long') &&
      parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<int>> grid = __codev_parse_vector_vector_int(line1);

    Solution sol;
    int ans = sol.${parsed.methodName}(grid);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 6. 2D Vector Int: matrix -> matrix (e.g. floodFill, transpose)
export const matrixToMatrixMatcher: DriverMatcher = {
  name: 'matrix_to_matrix',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<vector<int>>') &&
      parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<int>> grid = __codev_parse_vector_vector_int(line1);

    Solution sol;
    std::vector<std::vector<int>> ans = sol.${parsed.methodName}(grid);
    __codev_print_vector_vector_int(ans);
    return 0;
}
`;
  },
};

// 7. 2D Vector Int: in-place void (e.g. rotate, setZeroes)
export const matrixInPlaceMatcher: DriverMatcher = {
  name: 'matrix_in_place',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'void' &&
      parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::vector<int>> matrix = __codev_parse_vector_vector_int(line1);

    Solution sol;
    sol.${parsed.methodName}(matrix);
    __codev_print_vector_vector_int(matrix);
    return 0;
}
`;
  },
};

// 8. Vector String -> 2D Vector String (e.g. groupAnagrams)
export const vectorStringToMatrixStringMatcher: DriverMatcher = {
  name: 'vector_string_to_matrix_string',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<vector<string>>') &&
      parsed.argsStr.includes('vector<string>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::string> strs = __codev_parse_vector_string(line1);

    Solution sol;
    std::vector<std::vector<std::string>> ans = sol.${parsed.methodName}(strs);
    __codev_print_vector_vector_string(ans);
    return 0;
}
`;
  },
};

// 9. (String, Vector String) -> Bool (e.g. wordBreak)
export const stringAndVectorStringToBoolMatcher: DriverMatcher = {
  name: 'string_and_vector_string_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('string') &&
      parsed.argsStr.includes('vector<string>') &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string s;
    if (!std::getline(std::cin, s)) return 0;
    while (s.empty() && std::getline(std::cin, s));
    if (s.size() >= 2 && s.front() == '"' && s.back() == '"') {
        s = s.substr(1, s.size() - 2);
    }

    std::string line2 = __codev_read_balanced_token();
    if (line2.empty()) return 0;
    std::vector<std::string> wordDict = __codev_parse_vector_string(line2);

    Solution sol;
    bool ans = sol.${parsed.methodName}(s, wordDict);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 10. Vector String -> String (e.g. longestCommonPrefix)
export const vectorStringToStringMatcher: DriverMatcher = {
  name: 'vector_string_to_string',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'string' &&
      parsed.argsStr.includes('vector<string>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<std::string> strs = __codev_parse_vector_string(line1);

    Solution sol;
    std::string ans = sol.${parsed.methodName}(strs);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 11. Int -> Vector String (e.g. generateParenthesis, fizzBuzz)
export const intToVectorStringMatcher: DriverMatcher = {
  name: 'int_to_vector_string',
  matches(parsed: ParsedMethod) {
    const trimmed = parsed.argsStr.trim();
    return (
      parsed.returnType.includes('vector<string>') &&
      (trimmed.startsWith('int') || trimmed.startsWith('long')) &&
      !parsed.argsStr.includes('vector') &&
      !parsed.argsStr.includes('string') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int n = 0;
    if (!(std::cin >> n)) return 0;

    Solution sol;
    std::vector<std::string> ans = sol.${parsed.methodName}(n);
    __codev_print_vector_string(ans);
    return 0;
}
`;
  },
};

// 12. String -> Vector String (e.g. letterCombinations)
export const stringToVectorStringMatcher: DriverMatcher = {
  name: 'string_to_vector_string',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<string>') &&
      parsed.argsStr.includes('string') &&
      !parsed.argsStr.includes('vector') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
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
    std::vector<std::string> ans = sol.${parsed.methodName}(s);
    __codev_print_vector_string(ans);
    return 0;
}
`;
  },
};

// 13. Vector Char in-place: void (e.g. reverseString)
export const vectorCharInPlaceMatcher: DriverMatcher = {
  name: 'vector_char_in_place',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'void' &&
      parsed.argsStr.includes('vector<char>') &&
      !parsed.argsStr.includes('vector<vector<char>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<char> s = __codev_parse_vector_char(line1);

    Solution sol;
    sol.${parsed.methodName}(s);
    __codev_print_vector_char(s);
    return 0;
}
`;
  },
};

// 14. Vector Int & Int -> 2D Vector Int (e.g. combinationSum, combinationSum2, 4Sum)
export const vectorAndIntToVectorVectorMatcher: DriverMatcher = {
  name: 'vector_and_int_to_vector_vector',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<vector<int>>') &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      hasStandaloneInt(parsed.argsStr) &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> candidates = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    std::vector<std::vector<int>> ans = sol.${parsed.methodName}(candidates, target);
    __codev_print_vector_vector_int(ans);
    return 0;
}
`;
  },
};

// 15. Vector Int -> 2D Vector Int (e.g. 3Sum, subsets, permute)
export const vectorToVectorVectorMatcher: DriverMatcher = {
  name: 'vector_to_vector_vector',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<vector<int>>') &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    std::vector<std::vector<int>> ans = sol.${parsed.methodName}(nums);
    __codev_print_vector_vector_int(ans);
    return 0;
}
`;
  },
};

// 16. Two Vector Ints -> Vector Int (e.g. intersection)
export const twoVectorsToVectorMatcher: DriverMatcher = {
  name: 'two_vectors_to_vector',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<int>') &&
      !parsed.returnType.includes('vector<vector<int>>') &&
      (parsed.argsStr.match(/vector\s*<\s*int\s*>/g) || []).length === 2 &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::string line2 = __codev_read_balanced_token();
    if (line2.empty()) return 0;

    std::vector<int> nums1 = __codev_parse_vector_int(line1);
    std::vector<int> nums2 = __codev_parse_vector_int(line2);

    Solution sol;
    std::vector<int> ans = sol.${parsed.methodName}(nums1, nums2);
    __codev_print_vector_int(ans);
    return 0;
}
`;
  },
};

// 17. Two Vector Ints -> Double (e.g. findMedianSortedArrays)
export const twoVectorsToDoubleMatcher: DriverMatcher = {
  name: 'two_vectors_to_double',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('double') &&
      (parsed.argsStr.match(/vector\s*<\s*int\s*>/g) || []).length === 2 &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::string line2 = __codev_read_balanced_token();
    if (line2.empty()) return 0;

    std::vector<int> nums1 = __codev_parse_vector_int(line1);
    std::vector<int> nums2 = __codev_parse_vector_int(line2);

    Solution sol;
    double ans = sol.${parsed.methodName}(nums1, nums2);
    std::cout << std::fixed << std::setprecision(5) << ans << std::endl;
    return 0;
}
`;
  },
};

// 18. Vector & Int -> Bool (e.g. containsNearbyDuplicate, search in rotated array)
export const vectorAndIntToBoolMatcher: DriverMatcher = {
  name: 'vector_and_int_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      hasStandaloneInt(parsed.argsStr) &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    bool ans = sol.${parsed.methodName}(nums, target);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 19. 1D Vector & Int -> Vector (e.g. twoSum)
export const vectorAndIntToVectorMatcher: DriverMatcher = {
  name: 'vector_and_int_to_vector',
  matches(parsed: ParsedMethod) {
    return (
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      hasStandaloneInt(parsed.argsStr) &&
      parsed.returnType.includes('vector<int>') &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    std::vector<int> ans = sol.${parsed.methodName}(nums, target);
    __codev_print_vector_int(ans);
    return 0;
}
`;
  },
};

// 20. 1D Vector -> Vector (e.g. sortedSquares)
export const vectorToVectorMatcher: DriverMatcher = {
  name: 'vector_to_vector',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('vector<int>') &&
      !parsed.returnType.includes('vector<vector<int>>') &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    std::vector<int> ans = sol.${parsed.methodName}(nums);
    __codev_print_vector_int(ans);
    return 0;
}
`;
  },
};

// 21. 1D Vector in-place: void (e.g. moveZeroes, sortColors)
export const vectorInPlaceMatcher: DriverMatcher = {
  name: 'vector_in_place',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'void' &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    sol.${parsed.methodName}(nums);
    __codev_print_vector_int(nums);
    return 0;
}
`;
  },
};

// 22. 1D Vector -> Bool (e.g. containsDuplicate)
export const vectorToBoolMatcher: DriverMatcher = {
  name: 'vector_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    bool ans = sol.${parsed.methodName}(nums);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 23. 1D Vector -> Int (e.g. maxSubArray, singleNumber, majorityElement)
export const vectorToIntMatcher: DriverMatcher = {
  name: 'vector_to_int',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'int' &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      parsed.params.length === 1
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    Solution sol;
    int ans = sol.${parsed.methodName}(nums);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 24. 1D Vector & Int -> Int (e.g. binarySearch / search / removeElement)
export const vectorAndIntToIntMatcher: DriverMatcher = {
  name: 'vector_and_int_to_int',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'int' &&
      parsed.argsStr.includes('vector<int>') &&
      !parsed.argsStr.includes('vector<vector<int>>') &&
      hasStandaloneInt(parsed.argsStr) &&
      parsed.params.length === 2
    );
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;
    std::vector<int> nums = __codev_parse_vector_int(line1);

    int target = 0;
    if (!(std::cin >> target)) return 0;

    Solution sol;
    int ans = sol.${parsed.methodName}(nums, target);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

export const vectorMatchers: DriverMatcher[] = [
  matrixCharInPlaceMatcher,
  matrixCharToIntMatcher,
  matrixCharToBoolMatcher,
  matrixAndIntToBoolMatcher,
  matrixToIntMatcher,
  matrixToMatrixMatcher,
  matrixInPlaceMatcher,
  vectorStringToMatrixStringMatcher,
  stringAndVectorStringToBoolMatcher,
  vectorStringToStringMatcher,
  intToVectorStringMatcher,
  stringToVectorStringMatcher,
  vectorCharInPlaceMatcher,
  vectorAndIntToVectorVectorMatcher,
  vectorToVectorVectorMatcher,
  twoVectorsToVectorMatcher,
  twoVectorsToDoubleMatcher,
  vectorAndIntToBoolMatcher,
  vectorAndIntToVectorMatcher,
  vectorToVectorMatcher,
  vectorInPlaceMatcher,
  vectorToBoolMatcher,
  vectorToIntMatcher,
  vectorAndIntToIntMatcher,
];
