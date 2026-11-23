import { DriverMatcher, ParsedMethod } from '../../types.js';

// 1. (Double, Int) -> Double (e.g. myPow)
export const doubleAndIntToDoubleMatcher: DriverMatcher = {
  name: 'double_and_int_to_double',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('double') &&
      parsed.argsStr.includes('double') &&
      parsed.argsStr.includes('int')
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    double x = 0.0;
    long long n = 0;
    if (!(std::cin >> x >> n)) return 0;

    Solution sol;
    double ans = sol.${parsed.methodName}(x, (int)n);
    std::cout << std::fixed << std::setprecision(5) << ans << std::endl;
    return 0;
}
`;
  },
};

// 2. (Int) -> Bool (e.g. isPalindrome, isPowerOfTwo)
export const intToBoolMatcher: DriverMatcher = {
  name: 'int_to_bool',
  matches(parsed: ParsedMethod) {
    const trimmedArgs = parsed.argsStr.trim();
    return (
      parsed.returnType === 'bool' &&
      (trimmedArgs.startsWith('int') || trimmedArgs.startsWith('long')) &&
      !parsed.argsStr.includes('vector') &&
      !parsed.argsStr.includes('string')
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    long long n = 0;
    if (!(std::cin >> n)) return 0;

    Solution sol;
    bool ans = sol.${parsed.methodName}((int)n);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 3. (Int) -> Int (e.g. climbStairs, fib, reverse)
export const intToIntMatcher: DriverMatcher = {
  name: 'int_to_int',
  matches(parsed: ParsedMethod) {
    const trimmedArgs = parsed.argsStr.trim();
    return (
      (parsed.returnType === 'int' || parsed.returnType === 'long long') &&
      (trimmedArgs.startsWith('int') || trimmedArgs.startsWith('long')) &&
      !parsed.argsStr.includes('vector') &&
      !parsed.argsStr.includes('string') &&
      !parsed.argsStr.includes(',')
    );
  },
  generate(parsed: ParsedMethod) {
    return `
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    long long n = 0;
    if (!(std::cin >> n)) return 0;

    Solution sol;
    auto ans = sol.${parsed.methodName}((int)n);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

export const primitiveMatchers: DriverMatcher[] = [
  doubleAndIntToDoubleMatcher,
  intToBoolMatcher,
  intToIntMatcher,
];
