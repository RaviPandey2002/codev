/**
 * CodeV Arena Importer - Codeforces Content Script
 * Extracts full problem statements, KaTeX/MathJax formulas, and sample testcases directly from Codeforces DOM.
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

  function extractCodeforcesProblem() {
    const statementEl = document.querySelector('.problem-statement');
    if (!statementEl) return null;

    // 1. Extract Title
    const titleEl = statementEl.querySelector('.header .title');
    const rawTitle = titleEl ? titleEl.innerText.trim() : document.title;
    const title = rawTitle.replace(/\s+/g, ' ');

    // 2. Extract Limits
    const timeLimitEl = statementEl.querySelector('.header .time-limit');
    const timeLimit = timeLimitEl
      ? timeLimitEl.innerText.replace(/^time limit per test\s*/i, '').trim()
      : '2.0 seconds';

    const memoryLimitEl = statementEl.querySelector('.header .memory-limit');
    const memoryLimit = memoryLimitEl
      ? memoryLimitEl.innerText.replace(/^memory limit per test\s*/i, '').trim()
      : '256 megabytes';

    // 3. Extract Full HTML Statement Body
    const bodyClone = statementEl.cloneNode(true);
    const toolbarInClone = bodyClone.querySelector('.codev-cf-toolbar');
    if (toolbarInClone) toolbarInClone.remove();

    const headerInClone = bodyClone.querySelector('.header');
    if (headerInClone) headerInClone.remove();

    const sampleTestsInClone = bodyClone.querySelector('.sample-tests');
    if (sampleTestsInClone) sampleTestsInClone.remove();

    // Strip MathJax hidden preview and assistive elements to prevent duplicate variables (e.g. nn, 11)
    const assistiveElements = bodyClone.querySelectorAll(
      '.MathJax_Preview, .MathJax_Assistive_MathML, .MJX_Assistive_MathML, script[type="math/tex"]'
    );
    assistiveElements.forEach((el) => el.remove());

    // Fix relative image links so they point to absolute codeforces.com URLs
    const imgs = bodyClone.querySelectorAll('img');
    imgs.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/')) {
        img.setAttribute('src', `https://codeforces.com${src}`);
      }
    });

    const descriptionHtml = bodyClone.innerHTML;

    // 4. Extract Sample Test Cases
    const sampleCases = [];
    const sampleTestEl = statementEl.querySelector('.sample-test');
    if (sampleTestEl) {
      const inputs = sampleTestEl.querySelectorAll('.input pre');
      const outputs = sampleTestEl.querySelectorAll('.output pre');

      for (let i = 0; i < inputs.length; i++) {
        let rawIn = '';
        const testLines = inputs[i].querySelectorAll('.test-example-line');
        if (testLines && testLines.length > 0) {
          const linesArr = [];
          for (let j = 0; j < testLines.length; j++) {
            linesArr.push(testLines[j].innerText);
          }
          rawIn = linesArr.join('\n');
        } else {
          rawIn = inputs[i].innerText;
        }

        const rawOut = outputs[i] ? outputs[i].innerText : '';

        const cleanIn = rawIn.replace(/^Copy\s*/i, '').replace(/^\s*input\s*/i, '').trim();
        const cleanOut = rawOut.replace(/^Copy\s*/i, '').replace(/^\s*output\s*/i, '').trim();

        sampleCases.push({
          id: String(i + 1),
          name: `Case ${i + 1}`,
          input: cleanIn,
          output: cleanOut,
        });
      }
    }

    // 5. Extract Tags & Difficulty if present in sidebar
    const tags = [];
    let difficulty;
    const tagBoxes = document.querySelectorAll('.tag-box');
    tagBoxes.forEach((tb) => {
      const text = tb.innerText.trim();
      if (/^\*\d+$/.test(text)) {
        difficulty = text.replace('*', '');
      } else if (text) {
        tags.push(text);
      }
    });

    // 6. Match Contest ID and Index from URL
    const url = window.location.href;
    const match = url.match(/(?:contest|problemset\/problem|gym)\/(\d+)\/problem\/([A-Za-z0-9]+)/i);
    const contestId = match ? parseInt(match[1], 10) : undefined;
    const index = match ? match[2] : undefined;

    return {
      title,
      platform: 'CODEFORCES',
      url,
      contestId,
      index,
      timeLimit,
      memoryLimit,
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
    if (document.getElementById('codev-cf-export-btn')) return;

    const statementEl = document.querySelector('.problem-statement');
    if (!statementEl) return;

    const header = statementEl.querySelector('.header');
    if (!header) return;

    // Option A: Clean right-aligned toolbar strip directly above the centered problem header
    const toolbar = document.createElement('div');
    toolbar.className = 'codev-cf-toolbar';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'codev-cf-export-btn';
    btn.className = 'codev-btn';
    btn.innerHTML = `${ICON_BOLT}<span>Open in CodeV</span>`;
    btn.title = 'Send full statement, math formulas, and test cases to CodeV Arena';

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.className = 'codev-btn codev-loading';
      btn.innerHTML = `${ICON_SPINNER}<span>Sending...</span>`;

      const problemData = extractCodeforcesProblem();
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

      chrome.runtime.sendMessage(
        { action: 'SEND_PROBLEM', problem: problemData },
        (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            btn.className = 'codev-btn codev-error';
            btn.innerHTML = `${ICON_ALERT}<span>Retry CodeV</span>`;
            const detail = response?.error || chrome.runtime.lastError?.message || 'Check server URL in CodeV extension popup';
            showToast(`Could not deliver to CodeV: ${detail}`, true);
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

    toolbar.appendChild(btn);
    statementEl.insertBefore(toolbar, header);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'GET_PROBLEM_DATA') {
      const data = extractCodeforcesProblem();
      sendResponse({ problem: data });
    }
    return true;
  });
})();
