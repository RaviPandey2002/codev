export const PYTHON_LEETCODE_HEADER = `from typing import *
import collections
import heapq
import bisect
import math
import sys
import json

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __codev_build_list(vals):
    if not isinstance(vals, list):
        return vals
    dummy = ListNode(0)
    cur = dummy
    for v in vals:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def __codev_list_to_array(node):
    res = []
    cur = node
    while cur:
        res.append(cur.val)
        cur = cur.next
    return res

def __codev_build_tree(vals):
    if not isinstance(vals, list) or not vals:
        return None
    root = TreeNode(vals[0])
    queue = [root]
    i = 1
    while queue and i < len(vals):
        cur = queue.pop(0)
        if i < len(vals) and vals[i] is not None:
            cur.left = TreeNode(vals[i])
            queue.append(cur.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            cur.right = TreeNode(vals[i])
            queue.append(cur.right)
        i += 1
    return root

def __codev_tree_to_array(root):
    if not root:
        return []
    res = []
    queue = [root]
    while queue:
        cur = queue.pop(0)
        if cur:
            res.append(cur.val)
            queue.append(cur.left)
            queue.append(cur.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

`;
