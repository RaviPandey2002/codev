import type { ArenaPlatform, CodeSnippet } from '@codev/shared';

export interface CuratedWishlistProblem {
  title: string;
  platform: ArenaPlatform;
  difficulty: string;
  urlOrId: string;
  sampleCases: Array<{
    id: string;
    name: string;
    input: string;
    output: string;
  }>;
  codeSnippets?: CodeSnippet[];
}

export interface CuratedWishlist {
  id: string;
  title: string;
  category: 'INTERVIEW' | 'ALGORITHMS' | 'DATA_STRUCTURES';
  description: string;
  problems: CuratedWishlistProblem[];
}

export const CURATED_WISHLISTS: CuratedWishlist[] = [
  {
    id: 'top-interview-classics',
    title: 'Top Interview Classics',
    category: 'INTERVIEW',
    description: 'High-frequency coding interview foundational problems',
    problems: [
      {
        title: '1. Two Sum',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/two-sum/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[2,7,11,15]\n9', output: '[0,1]' },
          { id: '2', name: 'Case 2', input: '[3,2,4]\n6', output: '[1,2]' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass\n`,
          },
        ],
      },
      {
        title: '2. Add Two Numbers',
        platform: 'LEETCODE',
        difficulty: 'Medium',
        urlOrId: 'https://leetcode.com/problems/add-two-numbers/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[2,4,3]\n[5,6,4]', output: '[7,0,8]' },
          { id: '2', name: 'Case 2', input: '[0]\n[0]', output: '[0]' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:\n        pass\n`,
          },
        ],
      },
      {
        title: '15. 3Sum',
        platform: 'LEETCODE',
        difficulty: 'Medium',
        urlOrId: 'https://leetcode.com/problems/3sum/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass\n`,
          },
        ],
      },
      {
        title: '20. Valid Parentheses',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/valid-parentheses/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '"()"', output: 'true' },
          { id: '2', name: 'Case 2', input: '"()[]{}"', output: 'true' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def isValid(self, s: str) -> bool:\n        pass\n`,
          },
        ],
      },
    ],
  },
  {
    id: 'binary-search-essentials',
    title: 'Binary Search Essentials',
    category: 'ALGORITHMS',
    description: 'Master binary search boundaries, predicates, and search spaces',
    problems: [
      {
        title: '704. Binary Search',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/binary-search/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[-1,0,3,5,9,12]\n9', output: '4' },
          { id: '2', name: 'Case 2', input: '[-1,0,3,5,9,12]\n2', output: '-1' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass\n`,
          },
        ],
      },
      {
        title: '33. Search in Rotated Sorted Array',
        platform: 'LEETCODE',
        difficulty: 'Medium',
        urlOrId: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[4,5,6,7,0,1,2]\n0', output: '4' },
          { id: '2', name: 'Case 2', input: '[4,5,6,7,0,1,2]\n3', output: '-1' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass\n`,
          },
        ],
      },
    ],
  },
  {
    id: 'dynamic-programming-starters',
    title: 'Dynamic Programming Starters',
    category: 'ALGORITHMS',
    description: 'Core 1D memoization, recurrence relations, and bottom-up tables',
    problems: [
      {
        title: '70. Climbing Stairs',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/climbing-stairs/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '2', output: '2' },
          { id: '2', name: 'Case 2', input: '3', output: '3' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    int climbStairs(int n) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass\n`,
          },
        ],
      },
      {
        title: '322. Coin Change',
        platform: 'LEETCODE',
        difficulty: 'Medium',
        urlOrId: 'https://leetcode.com/problems/coin-change/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[1,2,5]\n11', output: '3' },
          { id: '2', name: 'Case 2', input: '[2]\n3', output: '-1' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        pass\n`,
          },
        ],
      },
    ],
  },
  {
    id: 'linked-list-basics',
    title: 'Linked List Fundamentals',
    category: 'DATA_STRUCTURES',
    description: 'Pointer manipulation, sentinel nodes, and reversing lists',
    problems: [
      {
        title: '206. Reverse Linked List',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/reverse-linked-list/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[1,2,3,4,5]', output: '[5,4,3,2,1]' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        pass\n`,
          },
        ],
      },
      {
        title: '21. Merge Two Sorted Lists',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/merge-two-sorted-lists/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[1,2,4]\n[1,3,4]', output: '[1,1,2,3,4,4]' },
        ],
        codeSnippets: [
          {
            lang: 'C++',
            langSlug: 'cpp',
            code: `/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        \n    }\n};`,
          },
          {
            lang: 'Python3',
            langSlug: 'python3',
            code: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        pass\n`,
          },
        ],
      },
    ],
  },
];
