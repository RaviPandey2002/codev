document.addEventListener('DOMContentLoaded', async () => {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const problemTitleEl = document.getElementById('problem-title');
  const problemMetaEl = document.getElementById('problem-meta');
  const platformBadge = document.getElementById('platform-badge');
  const sendBtn = document.getElementById('send-btn');
  const feedbackBanner = document.getElementById('feedback-banner');
  const lastSentSection = document.getElementById('last-sent-section');
  const lastSentTitle = document.getElementById('last-sent-title');
  const footerLink = document.getElementById('arena-footer-link');

  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const inputApiUrl = document.getElementById('input-api-url');
  const inputClientUrl = document.getElementById('input-client-url');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn');

  let currentProblem = null;
  let activeConfig = await getCodevConfig();

  function syncUiToConfig(cfg) {
    activeConfig = cfg;
    inputApiUrl.value = cfg.apiUrl;
    inputClientUrl.value = cfg.clientUrl;
    footerLink.href = cfg.clientUrl;
    try {
      const host = new URL(cfg.clientUrl).host;
      footerLink.innerText = `Open CodeV Arena (${host}) ↗`;
    } catch {
      footerLink.innerText = `Open CodeV Arena ↗`;
    }
  }

  function isLocalUrl(urlStr) {
    try {
      const h = new URL(urlStr).hostname;
      return h === 'localhost' || h === '127.0.0.1';
    } catch {
      return false;
    }
  }

  async function checkServer(cfg) {
    statusPill.className = 'status-pill checking';
    statusText.innerText = 'Checking...';

    try {
      const res = await fetch(`${cfg.apiUrl}/health`);
      if (res.ok) {
        statusPill.className = 'status-pill online';
        statusText.innerText = 'Online';
        return true;
      }
    } catch {}

    if (cfg.localCompanionUrl && isLocalUrl(cfg.apiUrl)) {
      try {
        const res = await fetch(`${cfg.localCompanionUrl}/health`);
        if (res.ok) {
          statusPill.className = 'status-pill online';
          statusText.innerText = 'Online (:10043)';
          return true;
        }
      } catch {}
    }

    statusPill.className = 'status-pill offline';
    statusText.innerText = 'Offline';
    return false;
  }

  syncUiToConfig(activeConfig);
  checkServer(activeConfig);

  // Settings Panel Handlers
  settingsToggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const newApi = inputApiUrl.value.trim().replace(/\/+$/, '');
    const newClient = inputClientUrl.value.trim().replace(/\/+$/, '');
    if (!newApi || !newClient) return;

    // Request host permission for custom user-entered domains if needed
    const originsToRequest = [];
    for (const candidate of [newApi, newClient]) {
      try {
        const parsed = new URL(candidate);
        originsToRequest.push(`${parsed.protocol}//${parsed.host}/*`);
      } catch {}
    }

    if (originsToRequest.length > 0 && chrome.permissions?.request) {
      try {
        await chrome.permissions.request({ origins: originsToRequest });
      } catch {
        // Optional permission prompt might fail if already statically covered
      }
    }

    await chrome.storage.sync.set({
      codevApiUrl: newApi,
      codevClientUrl: newClient,
    });

    const refreshed = await getCodevConfig();
    syncUiToConfig(refreshed);
    const ok = await checkServer(refreshed);
    feedbackBanner.className = ok ? 'feedback-banner success' : 'feedback-banner error';
    feedbackBanner.innerText = ok
      ? `✓ Connected to ${new URL(refreshed.apiUrl).host}`
      : `⚠️ Could not reach ${refreshed.apiUrl}/health`;
  });

  resetSettingsBtn.addEventListener('click', async () => {
    await chrome.storage.sync.remove(['codevApiUrl', 'codevClientUrl']);
    const defaults = await getCodevConfig();
    syncUiToConfig(defaults);
    await checkServer(defaults);
    feedbackBanner.className = 'feedback-banner hidden';
  });

  // Query Active Tab for Problem Data
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      const isCf =
        tab.url &&
        (tab.url.includes('codeforces.com/contest/') ||
          tab.url.includes('codeforces.com/problemset/problem/') ||
          tab.url.includes('codeforces.com/gym/'));
      const isLc = tab.url && tab.url.includes('leetcode.com/problems/');

      if (isCf || isLc) {
        platformBadge.innerText = isCf ? 'Codeforces' : 'LeetCode';
        platformBadge.className = `badge ${isCf ? 'codeforces' : 'leetcode'}`;

        chrome.tabs.sendMessage(tab.id, { action: 'GET_PROBLEM_DATA' }, (response) => {
          if (!chrome.runtime.lastError && response && response.problem) {
            currentProblem = response.problem;
            problemTitleEl.innerText = currentProblem.title;
            const casesCount = currentProblem.sampleCases?.length || 0;
            problemMetaEl.innerText = `${casesCount} test cases | Limits: ${currentProblem.timeLimit || '2s'}, ${currentProblem.memoryLimit || '256MB'}`;
            sendBtn.disabled = false;
          } else {
            problemTitleEl.innerText = tab.title.replace(/ - Codeforces.*| - LeetCode.*/i, '');
            problemMetaEl.innerText = 'Refresh this problem tab once to activate extension';
            sendBtn.disabled = true;
          }
        });
      } else {
        platformBadge.innerText = 'Inactive';
        platformBadge.className = 'badge';
        problemTitleEl.innerText = 'No CP Problem Detected';
        problemMetaEl.innerText = 'Navigate to a problem on Codeforces or LeetCode';
        sendBtn.disabled = true;
      }
    }
  } catch (err) {
    console.error('Failed to query tab:', err);
  }

  // Load Last Sent Problem
  chrome.storage.local.get(['lastProblem', 'lastSentAt'], (res) => {
    if (res.lastProblem) {
      lastSentSection.classList.remove('hidden');
      const timeStr = res.lastSentAt
        ? new Date(res.lastSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      lastSentTitle.innerText = `${res.lastProblem.title} (${timeStr})`;
    }
  });

  // Send Problem Handler
  sendBtn.addEventListener('click', async () => {
    if (!currentProblem) return;

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span>⏳ Sending...</span>';
    feedbackBanner.className = 'feedback-banner hidden';

    chrome.runtime.sendMessage({ action: 'SEND_PROBLEM', problem: currentProblem }, (response) => {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>⚡ Send to CodeV Arena</span>';

      if (!chrome.runtime.lastError && response && response.success) {
        feedbackBanner.className = 'feedback-banner success';
        feedbackBanner.innerText = response.roomId
          ? `✓ Sent "${currentProblem.title}" to Room #${response.roomId}`
          : `✓ Successfully sent "${currentProblem.title}" to CodeV!`;
        lastSentSection.classList.remove('hidden');
        lastSentTitle.innerText = `${currentProblem.title} (Just now)`;
      } else {
        feedbackBanner.className = 'feedback-banner error';
        feedbackBanner.innerText = `⚠️ Failed: ${response?.error || 'Check CodeV Server URL in ⚙️'}`;
      }
    });
  });
});
