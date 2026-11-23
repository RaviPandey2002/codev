export const PYTHON_RUNNER_TEMPLATE = `
# ========================================================
# [CodeV Injected LeetCode Driver]
# ========================================================
if __name__ == "__main__":
    raw_input_text = sys.stdin.read().strip()
    if raw_input_text:
        decoder = json.JSONDecoder()
        parsed_args = []
        idx = 0
        while idx < len(raw_input_text):
            while idx < len(raw_input_text) and raw_input_text[idx] in ' \\t\\r\\n,':
                idx += 1
            if idx >= len(raw_input_text):
                break
            try:
                obj, end_idx = decoder.raw_decode(raw_input_text, idx)
                parsed_args.append(obj)
                idx = end_idx
            except Exception:
                # Fallback for bare non-JSON strings/tokens
                rest = raw_input_text[idx:].split('\\n', 1)
                val = rest[0].strip()
                if val:
                    parsed_args.append(val)
                idx += len(rest[0]) + 1

        sol = Solution()
        import inspect

        candidate_names = [m for m in getattr(Solution, '__dict__', {}).keys() if not m.startswith('_') and callable(getattr(Solution, m))]
        if not candidate_names:
            candidate_names = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]

        target_func = None
        if candidate_names:
            def _score_candidate(fn):
                try:
                    sig = inspect.signature(fn)
                    params = [p for p in sig.parameters.values() if p.name != 'self' and p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)]
                    if len(params) != len(parsed_args):
                        return -100
                    score = 10
                    # Deprioritize common helper function prefixes
                    name_lower = fn.__name__.lower()
                    if any(prefix in name_lower for prefix in ('helper', 'dfs', 'bfs', 'util', 'calc')):
                        score -= 5
                    for p, arg in zip(params, parsed_args):
                        ann = str(p.annotation).lower()
                        if 'empty' in ann:
                            continue
                        if 'list' in ann or 'treenode' in ann or 'listnode' in ann:
                            score += 5 if isinstance(arg, list) else -10
                        elif 'int' in ann and not isinstance(arg, bool):
                            score += 5 if isinstance(arg, int) else -10
                        elif 'str' in ann:
                            score += 5 if isinstance(arg, str) else -10
                        elif 'bool' in ann:
                            score += 5 if isinstance(arg, bool) else -10
                    return score
                except Exception:
                    return -50

            scored = sorted([(m, _score_candidate(getattr(sol, m))) for m in candidate_names], key=lambda x: x[1], reverse=True)
            if scored and scored[0][1] > -100:
                target_func = getattr(sol, scored[0][0])
            else:
                target_func = getattr(sol, candidate_names[0])

        if target_func:
            sig = inspect.signature(target_func)
            param_names = list(sig.parameters.keys())
            if param_names and param_names[0] == 'self':
                param_names = param_names[1:]

            for idx_arg, p_name in enumerate(param_names):
                if idx_arg < len(parsed_args) and isinstance(parsed_args[idx_arg], list):
                    param_type = str(sig.parameters[p_name].annotation)
                    if 'ListNode' in param_type or p_name in ('l1', 'l2', 'head', 'list1', 'list2'):
                        parsed_args[idx_arg] = __codev_build_list(parsed_args[idx_arg])
                    elif 'TreeNode' in param_type or p_name in ('root', 'p', 'q', 'node'):
                        parsed_args[idx_arg] = __codev_build_tree(parsed_args[idx_arg])

            res = target_func(*parsed_args)
            if isinstance(res, ListNode):
                print(json.dumps(__codev_list_to_array(res), separators=(',', ':')))
            elif isinstance(res, TreeNode):
                print(json.dumps(__codev_tree_to_array(res), separators=(',', ':')))
            elif isinstance(res, bool):
                print("true" if res else "false")
            elif isinstance(res, (list, dict)):
                print(json.dumps(res, separators=(',', ':')))
            elif res is not None:
                print(res)
            elif len(parsed_args) > 0 and isinstance(parsed_args[0], (list, dict)):
                # In-place modification (e.g. moveZeroes), print modified arg0
                print(json.dumps(parsed_args[0], separators=(',', ':')))
        else:
            print("[CodeV Notice] Automatic test runner for this specific signature is coming soon.")
            print("Tip: You can add an 'if __name__ == \\"__main__\\":' block to run custom test cases.")
`;
