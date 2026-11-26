# CodeV Arena Companion Extension

Official browser extension for **CodeV Arena** that brings 1-click problem importing from **Codeforces** and **LeetCode** into your collaborative workspace.

---

## Why this extension?

1. **Bypasses Cloudflare Automatically**: Because you browse Codeforces in your own browser, Cloudflare verification is already completed.
2. **Complete Problem Statements**: Unlike standard Competitive Companion (which only sends sample cases without statements), CodeV Companion captures:
   - Complete story and problem statement HTML
   - LaTeX & MathJax formulas (`\le`, exponents, subscripts)
   - Input and Output format specifications
   - Memory limits and time limits
   - All sample test cases
   - Tags and difficulty ratings
3. **Works Locally & on Live Domains**: When downloaded from `/extension` on a CodeV server, the server's `PUBLIC_API_URL` and `CLIENT_URL` env variables are automatically pre-configured. You can also adjust endpoints anytime via the ⚙️ settings drawer in the extension popup.
4. **Native Injected Button**: Places a clean **`Open in CodeV`** pill cleanly in the top-right utility strip on Codeforces problem statements and inline on the title row of LeetCode problems.

---

## Quick Installation (Takes 30 Seconds)

1. Visit `/extension` in CodeV (or open `GET /problems/extension/download`) to download `codev-arena-companion.zip` and extract it (or load the repo's `extension/` folder directly).
2. Open your Chromium-based browser (Chrome, Brave, Edge, Arc).
3. Navigate to `chrome://extensions/`.
4. Toggle **Developer mode** to **ON** in the top-right corner.
5. Click **Load unpacked** and select the extracted folder.
6. The **CodeV Arena Companion** icon will appear in your toolbar!

---

## Supported Platforms
- **Codeforces**: Contest problems, Problemset, and Gym.
- **LeetCode**: All problem description pages (SPA navigation supported).
