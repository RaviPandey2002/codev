import { DriverMatcher, ParsedMethod } from '../../types.js';

export const treeNodeToTreeMatcher: DriverMatcher = {
  name: 'tree_node_to_tree',
  matches(parsed: ParsedMethod) {
    return parsed.returnType.includes('TreeNode') && parsed.argsStr.includes('TreeNode');
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;

    TreeNode* root = __codev_build_tree(line1);

    Solution sol;
    TreeNode* ans = sol.${parsed.methodName}(root);
    __codev_print_tree(ans);
    return 0;
}
`;
  },
};

export const treeNodeToIntMatcher: DriverMatcher = {
  name: 'tree_node_to_int',
  matches(parsed: ParsedMethod) {
    return parsed.returnType === 'int' && parsed.argsStr.includes('TreeNode');
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;

    TreeNode* root = __codev_build_tree(line1);

    Solution sol;
    int ans = sol.${parsed.methodName}(root);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

export const treeNodeToBoolMatcher: DriverMatcher = {
  name: 'tree_node_to_bool',
  matches(parsed: ParsedMethod) {
    return parsed.returnType === 'bool' && parsed.argsStr.includes('TreeNode');
  },
  generate(parsed: ParsedMethod, helpers: string) {
    return `
${helpers}
int main() {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string line1 = __codev_read_balanced_token();
    if (line1.empty()) return 0;

    TreeNode* p = __codev_build_tree(line1);

    std::string line2 = __codev_read_balanced_token();
    TreeNode* q = nullptr;
    if (!line2.empty()) {
        q = __codev_build_tree(line2);
    }

    Solution sol;
    bool ans = false;
    if (q != nullptr) {
        ans = sol.${parsed.methodName}(p, q);
    } else {
        ans = sol.${parsed.methodName}(p);
    }
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

export const treeNodeMatchers: DriverMatcher[] = [
  treeNodeToTreeMatcher,
  treeNodeToIntMatcher,
  treeNodeToBoolMatcher,
];
