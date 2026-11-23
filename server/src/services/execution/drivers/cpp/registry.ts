import { DriverMatcher } from '../types.js';
import { listNodeMatchers } from './matchers/list_node.matcher.js';
import { treeNodeMatchers } from './matchers/tree_node.matcher.js';
import { vectorMatchers } from './matchers/vector.matcher.js';
import { stringMatchers } from './matchers/string.matcher.js';
import { primitiveMatchers } from './matchers/primitive.matcher.js';

export const ALL_CPP_MATCHERS: DriverMatcher[] = [
  ...listNodeMatchers,
  ...treeNodeMatchers,
  ...vectorMatchers,
  ...stringMatchers,
  ...primitiveMatchers,
];

export function getFallbackDriver(): string {
  return `
int main() {
    std::cout << "[CodeV Notice] Automatic test runner for this specific signature is coming soon.\\n"
              << "Tip: You can add an 'int main()' at the bottom of your code to run custom test cases."
              << std::endl;
    return 0;
}
`;
}
