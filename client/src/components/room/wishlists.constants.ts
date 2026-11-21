import type { ArenaPlatform } from '@codev/shared';

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
      },
      {
        title: '15. 3Sum',
        platform: 'LEETCODE',
        difficulty: 'Medium',
        urlOrId: 'https://leetcode.com/problems/3sum/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
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
      },
      {
        title: '21. Merge Two Sorted Lists',
        platform: 'LEETCODE',
        difficulty: 'Easy',
        urlOrId: 'https://leetcode.com/problems/merge-two-sorted-lists/',
        sampleCases: [
          { id: '1', name: 'Case 1', input: '[1,2,4]\n[1,3,4]', output: '[1,1,2,3,4,4]' },
        ],
      },
    ],
  },
];
