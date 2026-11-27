/**
 * CodeV Arena Companion - Background Service Worker
 * Relays problem payloads directly to active CodeV room tabs or opens /import when no room tab is open.
 */

importScripts('../config.js');

function extractRoomIdFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const match = parsed.pathname.match(/\/rooms\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function isLocalHostname(urlStr) {
  try {
    const host = new URL(urlStr).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

function toOriginPattern(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'SEND_PROBLEM' && request.problem) {
    handleSendProblem(request.problem)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'GET_EXTENSION_CONFIG') {
    getCodevConfig()
      .then((cfg) => sendResponse({ config: cfg }))
      .catch(() => sendResponse({ config: self.CODEV_DEFAULT_CONFIG }));
    return true;
  }
});

async function handleSendProblem(problem) {
  const config = await getCodevConfig();
  const { apiUrl, clientUrl, localCompanionUrl } = config;

  let clientHost = '';
  try {
    clientHost = new URL(clientUrl).host;
  } catch {
    clientHost = '';
  }

  let deliveredToOpenTab = false;
  let deliveredToServer = false;
  let lastErr = null;
  let detectedRoomId = null;
  let importToken = null;

  // 1. Inspect open CodeV room tabs for instant delivery & room scoping
  try {
    const tabs = await chrome.tabs.query({});
    const matchingTabs = tabs.filter((tab) => {
      if (!tab.url || !tab.url.includes('/rooms/')) return false;
      if (clientHost && tab.url.includes(clientHost)) return true;
      return tab.url.includes('localhost:5173') || tab.url.includes('127.0.0.1:5173');
    });

    matchingTabs.sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)));

    for (const tab of matchingTabs) {
      if (!detectedRoomId) {
        detectedRoomId = extractRoomIdFromUrl(tab.url);
      }

      if (tab.id !== undefined) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (prob) => {
              window.postMessage({ type: 'CODEV_ADD_PROBLEM', problem: prob }, '*');
            },
            args: [problem],
          });
          deliveredToOpenTab = true;
        } catch {
          // Fallback to server API delivery
        }
      }
    }
  } catch {
    // Tabs permission fallback
  }

  // Check host permission explicitly for clearer diagnostics when custom domains are used
  const apiPattern = toOriginPattern(apiUrl);
  if (apiPattern && chrome.permissions?.contains) {
    try {
      const hasPerm = await chrome.permissions.contains({ origins: [apiPattern] });
      if (!hasPerm && !deliveredToOpenTab) {
        throw new Error(
          `Permission missing for ${apiUrl}. Open the CodeV extension popup (⚙️) and click Save & Test.`
        );
      }
    } catch (permErr) {
      if (permErr.message?.includes('Permission missing')) {
        throw permErr;
      }
    }
  }

  const companionPayload = {
    name: problem.title,
    group: problem.platform === 'LEETCODE' ? 'LeetCode' : 'Codeforces',
    url: problem.url,
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
    description: problem.description,
    tests: (problem.sampleCases || []).map((c) => ({
      input: c.input || '',
      output: c.output || '',
    })),
    difficulty: problem.difficulty,
    tags: problem.tags,
    platform: problem.platform,
    inputSpecification: problem.inputSpecification,
    outputSpecification: problem.outputSpecification,
    roomId: detectedRoomId || undefined,
  };

  // 2. Deliver to configured CodeV API server (works both locally & on live HTTPS domains)
  try {
    const endpoint = detectedRoomId
      ? `${apiUrl}/problems/companion?roomId=${encodeURIComponent(detectedRoomId)}`
      : `${apiUrl}/problems/companion`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companionPayload),
    });
    if (res.ok) {
      deliveredToServer = true;
      try {
        const data = await res.json();
        if (data?.importToken) {
          importToken = data.importToken;
        }
      } catch {}
    } else {
      lastErr = new Error(`Server ${apiUrl} responded with HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('[CodeV SW] Failed to deliver to API server:', apiUrl, err);
    lastErr = err;
  }

  // 3. Fallback to standalone local Companion port (:10043) only when running locally
  if (!deliveredToServer && localCompanionUrl && isLocalHostname(apiUrl)) {
    try {
      const localUrl = detectedRoomId
        ? `${localCompanionUrl}/?roomId=${encodeURIComponent(detectedRoomId)}`
        : localCompanionUrl;

      const res = await fetch(localUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companionPayload),
      });
      if (res.ok) {
        deliveredToServer = true;
      }
    } catch (err) {
      lastErr = lastErr || err;
    }
  }

  const delivered = deliveredToOpenTab || deliveredToServer;

  await chrome.storage.local.set({
    lastProblem: problem,
    lastSentAt: Date.now(),
  });

  if (!delivered) {
    const reason = lastErr?.message || 'Connection failed';
    throw new Error(`Could not reach ${apiUrl} (${reason}). Check ⚙️ Server URL in extension popup.`);
  }

  // 4. If NO CodeV room tab is open in the browser, open /import?token=... in a tab!
  let openedImportPage = false;
  if (!detectedRoomId && deliveredToServer) {
    const targetUrl = importToken
      ? `${clientUrl}/import?token=${encodeURIComponent(importToken)}`
      : `${clientUrl}/import`;
    try {
      await chrome.tabs.create({ url: targetUrl, active: true });
      openedImportPage = true;
    } catch (tabErr) {
      console.warn('[CodeV SW] Could not open /import tab:', tabErr);
    }
  }

  return {
    success: true,
    title: problem.title,
    roomId: detectedRoomId,
    target: apiUrl,
    openedImportPage,
  };
}
