/**
 * CodeV Arena Importer - LeetCode Content Script
 * Extracts rich problem descriptions, examples, and metadata from LeetCode.
 */

(function () {
  'use strict';

  const ICON_BOLT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  const ICON_SPINNER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  const ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const ICON_ALERT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  function findTitleElement() {
    const candidates = [
      document.querySelector('div[data-cy="question-title"]'),
      document.querySelector('.text-title-large'),
      document.querySelector('div[class*="text-title-large"]'),
      document.querySelector('h1'),
      document.querySelector('h4[class*="text-"]'),
    ];
    for (const el of candidates) {
      if (el && el.innerText && el.innerText.trim().length > 0) {
        return el;
      }
    }
    return null;
  }

  function getTitleSlug() {
    const slugMatch = window.location.pathname.match(/\/problems\/([^/?#]+)/);
    return slugMatch ? slugMatch[1] : '';
  }

  async function fetchLeetCodeSnippets(titleSlug) {
    if (!titleSlug) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const endpoint = `${window.location.origin}/graphql`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          query: `query getQuestionSnippets($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionFrontendId
              title
              codeSnippets {
                lang
                langSlug
                code
              }
            }
          }`,
          variables: { titleSlug },
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const json = await res.json();
      return json?.data?.question || null;
    } catch (err) {
      console.warn('[CodeV] Failed to fetch LeetCode snippets via GraphQL:', err);
      return null;
    }
  }

  let cachedProblem = null;
  let cachedPath = '';

  async function extractLeetCodeProblemAsync() {
    const baseProblem = extractLeetCodeProblem();
    if (!baseProblem) return null;

    const currentPath = window.location.pathname;
    if (cachedProblem && cachedPath === currentPath && cachedProblem.codeSnippets?.length) {
      return cachedProblem;
    }

    const slug = getTitleSlug();
    if (slug) {
      const graphData = await fetchLeetCodeSnippets(slug);
      if (graphData) {
        if (graphData.codeSnippets && graphData.codeSnippets.length > 0) {
          baseProblem.codeSnippets = graphData.codeSnippets;
        }
        if (graphData.questionFrontendId && graphData.title) {
          baseProblem.title = `${graphData.questionFrontendId}. ${graphData.title}`;
        }
      }
    }

    cachedProblem = baseProblem;
    cachedPath = currentPath;
    return baseProblem;
  }

  function extractLeetCodeProblem() {
    const contentEl =
      document.querySelector('div[data-track-load="description_content"]') ||
      document.querySelector('.elfjS') ||
      document.querySelector('.question-content__JfgR');

    if (!contentEl) return null;

    let title = '';
    const titleEl = findTitleElement();
    if (titleEl) {
      title = titleEl.innerText.trim();
    }

    if (!title && document.title) {
      const cleanTitle = document.title
        .replace(/\s*-\s*LeetCode.*$/i, '')
        .replace(/\s*\|\s*LeetCode.*$/i, '')
        .trim();
      if (cleanTitle && !/^(problems|leetcode|problem list)$/i.test(cleanTitle)) {
        title = cleanTitle;
      }
    }

    if (!title) {
      const slugMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
      if (slugMatch && slugMatch[1]) {
        title = slugMatch[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    if (!title) {
      title = 'LeetCode Problem';
    }

    // Extract Difficulty
    let difficulty;
    const diffEl = document.querySelector(
      'div[class*="text-difficulty-easy"], div[class*="text-difficulty-medium"], div[class*="text-difficulty-hard"]'
    );
    if (diffEl) {
      difficulty = diffEl.innerText.trim();
    } else {
      const allText = document.body.innerText;
      if (/\bEasy\b/i.test(allText)) difficulty = 'Easy';
      else if (/\bMedium\b/i.test(allText)) difficulty = 'Medium';
      else if (/\bHard\b/i.test(allText)) difficulty = 'Hard';
    }

    // Extract Description HTML (Cleaning UI buttons like "Original C++")
    const clone = contentEl.cloneNode(true);
    clone.querySelectorAll('button, [role="button"], [class*="example-toggle"]').forEach((el) => el.remove());

    const imgs = clone.querySelectorAll('img');
    imgs.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/')) {
        img.setAttribute('src', `https://leetcode.com${src}`);
      }
    });
    const descriptionHtml = clone.innerHTML;

    // Parse Examples from <pre> blocks
    const sampleCases = [];
    const preBlocks = contentEl.querySelectorAll('pre');
    let caseIdx = 1;

    preBlocks.forEach((pre) => {
      const text = pre.innerText;
      const inputMatch = text.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);
      const outputMatch = text.match(/Output:\s*([\s\S]*?)(?=Explanation:|$)/i);

      if (inputMatch && outputMatch) {
        sampleCases.push({
          id: String(caseIdx),
          name: `Case ${caseIdx}`,
          input: inputMatch[1].trim(),
          output: outputMatch[1].trim(),
        });
        caseIdx++;
      }
    });

    // Extract Tags
    const tags = [];
    const tagLinks = document.querySelectorAll('a[href*="/tag/"]');
    tagLinks.forEach((a) => {
      const t = a.innerText.trim();
      if (t && !tags.includes(t)) tags.push(t);
    });

    return {
      title,
      platform: 'LEETCODE',
      url: window.location.href,
      difficulty,
      tags: tags.length > 0 ? tags : undefined,
      description: descriptionHtml,
      sampleCases,
      sampleInput: sampleCases[0]?.input || '',
      sampleOutput: sampleCases[0]?.output || '',
    };
  }

  function showToast(message, isError = false) {
    const existing = document.getElementById('codev-toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'codev-toast-msg';
    toast.className = 'codev-toast';
    toast.style.borderColor = isError ? '#ef4444' : '#10b981';

    const iconWrap = document.createElement('span');
    iconWrap.style.color = isError ? '#f87171' : '#34d399';
    iconWrap.style.display = 'inline-flex';
    iconWrap.innerHTML = isError ? ICON_ALERT : ICON_BOLT;

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    toast.appendChild(iconWrap);
    toast.appendChild(textSpan);
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
  }

  function injectButton() {
    if (document.getElementById('codev-lc-export-btn')) return;

    const contentAnchor =
      document.querySelector('div[data-track-load="description_content"]') ||
      document.querySelector('.elfjS');
    if (!contentAnchor) return;

    const container = document.createElement('div');
    container.className = 'codev-btn-container';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'codev-lc-export-btn';
    btn.className = 'codev-btn';
    btn.innerHTML = `${ICON_BOLT}<span>Open in CodeV</span>`;
    btn.title = 'Send LeetCode problem & test cases to CodeV Arena';

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.className = 'codev-btn codev-loading';
      btn.innerHTML = `${ICON_SPINNER}<span>Fetching details...</span>`;

      const problemData = await extractLeetCodeProblemAsync();
      if (!problemData) {
        btn.className = 'codev-btn codev-error';
        btn.innerHTML = `${ICON_ALERT}<span>Parse Failed</span>`;
        showToast('Could not extract problem statement', true);
        setTimeout(() => {
          btn.disabled = false;
          btn.className = 'codev-btn';
          btn.innerHTML = `${ICON_BOLT}<span>Open in CodeV</span>`;
        }, 3000);
        return;
      }

      btn.innerHTML = `${ICON_SPINNER}<span>Sending to CodeV...</span>`;

      chrome.runtime.sendMessage(
        { action: 'SEND_PROBLEM', problem: problemData },
        (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            btn.className = 'codev-btn codev-error';
            btn.innerHTML = `${ICON_ALERT}<span>Retry CodeV</span>`;
            const detail = response?.error || chrome.runtime.lastError?.message || 'Check server URL in CodeV extension popup';
            showToast(`Could not deliver to CodeV: ${detail}`, true);
          } else if (response.openedImportPage) {
            btn.className = 'codev-btn codev-success';
            btn.innerHTML = `${ICON_CHECK}<span>Opening CodeV...</span>`;
            showToast(`Opening CodeV Arena to launch "${problemData.title}"...`);
          } else {
            btn.className = 'codev-btn codev-success';
            btn.innerHTML = `${ICON_CHECK}<span>Added to CodeV</span>`;
            showToast(`Added "${problemData.title}" (${problemData.sampleCases.length} cases) to CodeV!`);
          }

          setTimeout(() => {
            btn.disabled = false;
            btn.className = 'codev-btn';
            btn.innerHTML = `${ICON_BOLT}<span>Open in CodeV</span>`;
          }, 3200);
        }
      );
    });

    container.appendChild(btn);

    // Option A: Place inline on the right side of the question title header row
    const titleEl = findTitleElement();
    const titleRow = titleEl?.closest('.flex') || titleEl?.parentElement;

    if (titleRow) {
      const computedStyle = window.getComputedStyle(titleRow);
      if (computedStyle.display !== 'flex') {
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.justifyContent = 'space-between';
        titleRow.style.flexWrap = 'wrap';
        titleRow.style.gap = '10px';
      } else if (!titleRow.style.alignItems) {
        titleRow.style.alignItems = 'center';
      }
      titleRow.appendChild(container);
      return;
    }

    // Fallback: flush left above description without stray indent
    container.style.marginLeft = '0';
    container.style.marginBottom = '10px';
    contentAnchor.parentNode.insertBefore(container, contentAnchor);
  }

  // Handle LeetCode SPA dynamic loads and route switches cleanly
  let lastPath = window.location.pathname;
  const checkInterval = setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      const oldBtn = document.getElementById('codev-lc-export-btn');
      if (oldBtn?.parentNode) oldBtn.parentNode.removeChild(oldBtn.parentNode);
    }
    if (!document.getElementById('codev-lc-export-btn')) {
      injectButton();
    }
  }, 800);

  const observer = new MutationObserver(() => {
    if (!document.getElementById('codev-lc-export-btn')) {
      injectButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => clearInterval(checkInterval), 20000);

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'GET_PROBLEM_DATA') {
      extractLeetCodeProblemAsync()
        .then((data) => {
          sendResponse({ problem: data || extractLeetCodeProblem() });
        })
        .catch(() => {
          sendResponse({ problem: extractLeetCodeProblem() });
        });
      return true; // Keep channel open for async response
    }
  });
})();
