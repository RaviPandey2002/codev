// Default configuration for local unpacked development.
// When downloaded from CodeV Server (/problems/extension/download),
// this file is dynamically populated with PUBLIC_API_URL & CLIENT_URL.
self.CODEV_DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:3007',
  clientUrl: 'http://localhost:5173',
  localCompanionUrl: 'http://localhost:10043',
};

async function getCodevConfig() {
  try {
    const stored = await chrome.storage.sync.get(['codevApiUrl', 'codevClientUrl']);
    return {
      apiUrl: (stored.codevApiUrl || self.CODEV_DEFAULT_CONFIG.apiUrl).replace(/\/+$/, ''),
      clientUrl: (stored.codevClientUrl || self.CODEV_DEFAULT_CONFIG.clientUrl).replace(/\/+$/, ''),
      localCompanionUrl: self.CODEV_DEFAULT_CONFIG.localCompanionUrl,
    };
  } catch {
    return { ...self.CODEV_DEFAULT_CONFIG };
  }
}
