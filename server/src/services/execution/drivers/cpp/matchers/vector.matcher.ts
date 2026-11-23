import { DriverMatcher, ParsedMethod } from '../../types.js';

function getArgsWithoutVectors(argsStr: string): string {
  return argsStr.replace(/vector\s*<[^>]+>/g, '');
}

function hasStandaloneInt(argsStr: string): boolean {
  return /\b(int|long)\b/.test(getArgsWithoutVectors(argsStr));
}

// 1. 2D Vector Int: matrix -> int (e.g. numIslands, maxAreaOfIsland, minPathSum)
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

// 4. 2D Vector Char: in-place void (e.g. solveSudoku)
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

// 5. 2D Vector Int: matrix -> matrix (e.g. floodFill, transpose)
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

// 6. 2D Vector Int: in-place void (e.g. rotate, setZeroes)
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

// 7. Vector String -> String (e.g. longestCommonPrefix)
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

// 9. 1D Vector & Int -> Vector (e.g. twoSum)
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

    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
  },
};

// 10. 1D Vector -> Vector (e.g. sortedSquares)
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

    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
  },
};

// 11. 1D Vector in-place: void (e.g. moveZeroes, sortColors)
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

    std::cout << "[";
    for (size_t i = 0; i < nums.size(); ++i) {
        std::cout << nums[i] << (i + 1 < nums.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
  },
};

// 12. 1D Vector -> Bool (e.g. containsDuplicate)
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

// 13. 1D Vector -> Int (e.g. maxSubArray, singleNumber, majorityElement)
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

// 14. 1D Vector & Int -> Int (e.g. binarySearch / search / removeElement)
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
  matrixCharToIntMatcher,
  matrixCharToBoolMatcher,
  matrixCharInPlaceMatcher,
  matrixToIntMatcher,
  matrixToMatrixMatcher,
  matrixInPlaceMatcher,
  vectorStringToStringMatcher,
  vectorStringToMatrixStringMatcher,
  vectorAndIntToVectorMatcher,
  vectorToVectorMatcher,
  vectorInPlaceMatcher,
  vectorToBoolMatcher,
  vectorToIntMatcher,
  vectorAndIntToIntMatcher,
];
