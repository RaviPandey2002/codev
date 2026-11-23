export const CPP_HELPER_FUNCTIONS = `
static std::string __codev_read_balanced_token() {
    std::string token;
    std::string line;
    int balance = 0;
    bool has_bracket = false;
    while (std::getline(std::cin, line)) {
        if (token.empty() && line.empty()) continue;
        token += (token.empty() ? "" : "\\n") + line;
        for (char c : line) {
            if (c == '[' || c == '{') { balance++; has_bracket = true; }
            else if (c == ']' || c == '}') { balance--; }
        }
        if (!has_bracket || balance <= 0) break;
    }
    return token;
}

static std::vector<int> __codev_parse_vector_int(std::string s) {
    std::vector<int> res;
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    int num;
    while (ss >> num) res.push_back(num);
    return res;
}

static void __codev_print_vector_int(const std::vector<int>& vec) {
    std::cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        std::cout << vec[i] << (i + 1 < vec.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}

static std::vector<char> __codev_parse_vector_char(std::string s) {
    std::vector<char> res;
    bool in_quote = false;
    for (char c : s) {
        if (c == 34 || c == 39) {
            in_quote = !in_quote;
        } else if (in_quote) {
            res.push_back(c);
        } else if (c != ',' && c != '[' && c != ']' && !std::isspace((unsigned char)c)) {
            res.push_back(c);
        }
    }
    return res;
}

static void __codev_print_vector_char(const std::vector<char>& vec) {
    std::cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        std::cout << char(34) << vec[i] << char(34) << (i + 1 < vec.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}

static std::vector<std::vector<int>> __codev_parse_vector_vector_int(std::string s) {
    std::vector<std::vector<int>> matrix;
    size_t outer_open = s.find('[');
    size_t outer_close = s.rfind(']');
    if (outer_open == std::string::npos || outer_close == std::string::npos || outer_close <= outer_open) {
        return matrix;
    }
    std::string inner = s.substr(outer_open + 1, outer_close - outer_open - 1);
    size_t i = 0;
    while (i < inner.size()) {
        size_t start = inner.find('[', i);
        if (start == std::string::npos) break;
        size_t end = inner.find(']', start);
        if (end == std::string::npos) break;
        std::string sub = inner.substr(start + 1, end - start - 1);
        matrix.push_back(__codev_parse_vector_int(sub));
        i = end + 1;
    }
    return matrix;
}

static void __codev_print_vector_vector_int(const std::vector<std::vector<int>>& matrix) {
    std::cout << "[";
    for (size_t i = 0; i < matrix.size(); ++i) {
        std::cout << "[";
        for (size_t j = 0; j < matrix[i].size(); ++j) {
            std::cout << matrix[i][j] << (j + 1 < matrix[i].size() ? "," : "");
        }
        std::cout << "]" << (i + 1 < matrix.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}

static std::vector<std::vector<char>> __codev_parse_vector_vector_char(std::string s) {
    std::vector<std::vector<char>> matrix;
    size_t outer_open = s.find('[');
    size_t outer_close = s.rfind(']');
    if (outer_open == std::string::npos || outer_close == std::string::npos || outer_close <= outer_open) {
        return matrix;
    }
    std::string inner = s.substr(outer_open + 1, outer_close - outer_open - 1);
    size_t i = 0;
    while (i < inner.size()) {
        size_t start = inner.find('[', i);
        if (start == std::string::npos) break;
        size_t end = inner.find(']', start);
        if (end == std::string::npos) break;
        std::string sub = inner.substr(start + 1, end - start - 1);
        std::vector<char> row;
        bool in_quote = false;
        for (char c : sub) {
            if (c == 34 || c == 39) {
                in_quote = !in_quote;
            } else if (in_quote) {
                row.push_back(c);
            } else if (c != ',' && c != '[' && c != ']' && !std::isspace((unsigned char)c)) {
                row.push_back(c);
            }
        }
        matrix.push_back(row);
        i = end + 1;
    }
    return matrix;
}

static void __codev_print_vector_vector_char(const std::vector<std::vector<char>>& matrix) {
    std::cout << "[";
    for (size_t i = 0; i < matrix.size(); ++i) {
        std::cout << "[";
        for (size_t j = 0; j < matrix[i].size(); ++j) {
            std::cout << char(34) << matrix[i][j] << char(34) << (j + 1 < matrix[i].size() ? "," : "");
        }
        std::cout << "]" << (i + 1 < matrix.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}

static std::vector<std::string> __codev_parse_vector_string(std::string s) {
    std::vector<std::string> res;
    size_t i = 0;
    while (i < s.size()) {
        size_t start = s.find(char(34), i);
        if (start == std::string::npos) break;
        size_t end = s.find(char(34), start + 1);
        if (end == std::string::npos) break;
        res.push_back(s.substr(start + 1, end - start - 1));
        i = end + 1;
    }
    return res;
}

static void __codev_print_vector_string(const std::vector<std::string>& vec) {
    std::cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        std::cout << char(34) << vec[i] << char(34) << (i + 1 < vec.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}

static void __codev_print_vector_vector_string(const std::vector<std::vector<std::string>>& ans) {
    std::cout << "[";
    for (size_t i = 0; i < ans.size(); ++i) {
        std::cout << "[";
        for (size_t j = 0; j < ans[i].size(); ++j) {
            std::cout << char(34) << ans[i][j] << char(34) << (j + 1 < ans[i].size() ? "," : "");
        }
        std::cout << "]" << (i + 1 < ans.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}

static ListNode* __codev_build_list(const std::vector<int>& vals) {
    ListNode dummy(0);
    ListNode* cur = &dummy;
    for (int v : vals) {
        cur->next = new ListNode(v);
        cur = cur->next;
    }
    return dummy.next;
}

static void __codev_print_list(ListNode* head) {
    std::cout << "[";
    ListNode* cur = head;
    while (cur) {
        std::cout << cur->val;
        if (cur->next) std::cout << ",";
        cur = cur->next;
    }
    std::cout << "]" << std::endl;
}

static TreeNode* __codev_build_tree(std::string s) {
    for (char &c : s) {
        if (c == '[' || c == ']' || c == ',') c = ' ';
    }
    std::stringstream ss(s);
    std::string token;
    std::vector<std::string> tokens;
    while (ss >> token) tokens.push_back(token);
    if (tokens.empty() || tokens[0] == "null") return nullptr;

    TreeNode* root = new TreeNode(std::stoi(tokens[0]));
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < tokens.size()) {
        TreeNode* cur = q.front();
        q.pop();
        if (i < tokens.size() && tokens[i] != "null") {
            cur->left = new TreeNode(std::stoi(tokens[i]));
            q.push(cur->left);
        }
        i++;
        if (i < tokens.size() && tokens[i] != "null") {
            cur->right = new TreeNode(std::stoi(tokens[i]));
            q.push(cur->right);
        }
        i++;
    }
    return root;
}

static void __codev_print_tree(TreeNode* root) {
    if (!root) {
        std::cout << "[]" << std::endl;
        return;
    }
    std::vector<std::string> res;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* cur = q.front();
        q.pop();
        if (cur) {
            res.push_back(std::to_string(cur->val));
            q.push(cur->left);
            q.push(cur->right);
        } else {
            res.push_back("null");
        }
    }
    while (!res.empty() && res.back() == "null") res.pop_back();
    std::cout << "[";
    for (size_t i = 0; i < res.size(); ++i) {
        std::cout << res[i] << (i + 1 < res.size() ? "," : "");
    }
    std::cout << "]" << std::endl;
}
`;
