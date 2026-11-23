import { DriverMatcher, ParsedMethod } from '../../types.js';

function hasStandaloneInt(argsStr: string): boolean {
  return /\b(int|long)\b/.test(argsStr.replace(/vector\s*<[^>]+>/g, ''));
}

// 1. Linked List & Int -> Linked List (e.g. removeNthFromEnd, rotateRight, removeElements, partition)
export const listNodeAndIntToListMatcher: DriverMatcher = {
  name: 'list_node_and_int_to_list',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('ListNode') &&
      parsed.argsStr.includes('ListNode') &&
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
    ListNode* head = __codev_build_list(__codev_parse_vector_int(line1));

    int val = 0;
    if (!(std::cin >> val)) return 0;

    Solution sol;
    ListNode* ans = sol.${parsed.methodName}(head, val);
    __codev_print_list(ans);
    return 0;
}
`;
  },
};

// 2. Linked List (2 inputs) -> Linked List (e.g. addTwoNumbers, mergeTwoLists)
export const listNodeTwoInputsMatcher: DriverMatcher = {
  name: 'list_node_two_inputs',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('ListNode') &&
      parsed.argsStr.includes('ListNode') &&
      (parsed.argsStr.match(/ListNode/g) || []).length >= 2 &&
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

    ListNode* l1 = __codev_build_list(__codev_parse_vector_int(line1));
    ListNode* l2 = __codev_build_list(__codev_parse_vector_int(line2));

    Solution sol;
    ListNode* ans = sol.${parsed.methodName}(l1, l2);
    __codev_print_list(ans);
    return 0;
}
`;
  },
};

// 3. Linked List (1 input) -> Linked List (e.g. reverseList, middleNode)
export const listNodeSingleInputMatcher: DriverMatcher = {
  name: 'list_node_single_input',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType.includes('ListNode') &&
      parsed.argsStr.includes('ListNode') &&
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

    ListNode* head = __codev_build_list(__codev_parse_vector_int(line1));

    Solution sol;
    ListNode* ans = sol.${parsed.methodName}(head);
    __codev_print_list(ans);
    return 0;
}
`;
  },
};

// 4. Linked List -> Bool (e.g. hasCycle, isPalindrome)
export const listNodeBoolMatcher: DriverMatcher = {
  name: 'list_node_bool',
  matches(parsed: ParsedMethod) {
    return (
      parsed.returnType === 'bool' &&
      parsed.argsStr.includes('ListNode') &&
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

    ListNode* head = __codev_build_list(__codev_parse_vector_int(line1));

    Solution sol;
    bool ans = sol.${parsed.methodName}(head);
    std::cout << (ans ? "true" : "false") << std::endl;
    return 0;
}
`;
  },
};

export const listNodeMatchers: DriverMatcher[] = [
  listNodeAndIntToListMatcher,
  listNodeTwoInputsMatcher,
  listNodeSingleInputMatcher,
  listNodeBoolMatcher,
];
