export function buildCppHeaders(code: string): string {
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const hasListNodeDef = /\bstruct\s+ListNode\b/.test(cleaned);
  const hasTreeNodeDef = /\bstruct\s+TreeNode\b/.test(cleaned);

  return `
// ========================================================
// [CodeV LeetCode Environment Definitions]
// ========================================================
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
#include <climits>
#include <iomanip>
using namespace std;

#ifndef __CODEV_LEETCODE_STUBS__
#define __CODEV_LEETCODE_STUBS__

${hasListNodeDef ? '' : `
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
`}

${hasTreeNodeDef ? '' : `
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`}

#endif
`;
}
