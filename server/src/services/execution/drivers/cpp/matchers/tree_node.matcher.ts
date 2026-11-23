import { DriverMatcher, ParsedMethod } from '../../types.js';

function hasStandaloneInt(argsStr: string): boolean {
  return /\b(int|long)\b/.test(argsStr.replace(/vector\s*<[^>]+>/g, ''));
}

// 1. Binary Tree & Int -> Bool (e.g. hasPathSum)
export const treeNodeAndIntToBoolMatcher: DriverMatcher = {
  name: 'tree_node_and_int_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('TreeNode') &&
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
    TreeNode* root = __codev_build_tree(line1);

    int targetSum = 0;
    if (!(std::cin >> targetSum)) return 0;

    Solution sol;
    bool ans = sol.${parsed.methodName}(root, targetSum);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

// 2. Binary Tree & Int -> Int (e.g. kthSmallest)
export const treeNodeAndIntToIntMatcher: DriverMatcher = {
  name: 'tree_node_and_int_to_int',
  matches(parsed: ParsedMethod) {
    return (
      (parsed.returnType === 'int' || parsed.returnType === 'long long') &&
      parsed.argsStr.includes('TreeNode') &&
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
    TreeNode* root = __codev_build_tree(line1);

    int k = 0;
    if (!(std::cin >> k)) return 0;

    Solution sol;
    int ans = sol.${parsed.methodName}(root, k);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 3. Binary Tree & Int -> Binary Tree (e.g. insertIntoBST, deleteNode, searchBST)
export const treeNodeAndIntToTreeMatcher: DriverMatcher = {
  name: 'tree_node_and_int_to_tree',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('TreeNode') &&
      parsed.argsStr.includes('TreeNode') &&
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
    TreeNode* root = __codev_build_tree(line1);

    int val = 0;
    if (!(std::cin >> val)) return 0;

    Solution sol;
    TreeNode* ans = sol.${parsed.methodName}(root, val);
    __codev_print_tree(ans);
    return 0;
}
`;
  },
};

// 4. Binary Tree: (TreeNode*) -> TreeNode* (e.g. invertTree)
export const treeNodeToTreeMatcher: DriverMatcher = {
  name: 'tree_node_to_tree',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('TreeNode') &&
      parsed.argsStr.includes('TreeNode') &&
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

    TreeNode* root = __codev_build_tree(line1);

    Solution sol;
    TreeNode* ans = sol.${parsed.methodName}(root);
    __codev_print_tree(ans);
    return 0;
}
`;
  },
};

// 5. Binary Tree: (TreeNode*) -> int (e.g. maxDepth, minDepth)
export const treeNodeToIntMatcher: DriverMatcher = {
  name: 'tree_node_to_int',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'int' &&
      parsed.argsStr.includes('TreeNode') &&
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

    TreeNode* root = __codev_build_tree(line1);

    Solution sol;
    int ans = sol.${parsed.methodName}(root);
    std::cout << ans << std::endl;
    return 0;
}
`;
  },
};

// 6. Binary Tree: (TreeNode*) -> bool or (TreeNode*, TreeNode*) -> bool (e.g. isSameTree, isValidBST)
export const treeNodeToBoolMatcher: DriverMatcher = {
  name: 'tree_node_to_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('TreeNode') &&
      (parsed.params.length === 1 || parsed.params.length === 2)
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
  treeNodeAndIntToBoolMatcher,
  treeNodeAndIntToIntMatcher,
  treeNodeAndIntToTreeMatcher,
  treeNodeToTreeMatcher,
  treeNodeToIntMatcher,
  treeNodeToBoolMatcher,
];
