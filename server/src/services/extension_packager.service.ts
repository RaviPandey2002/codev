import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildZipArchive, type ZipEntryInput } from '../utils/zip.js';

export interface ExtensionRuntimeConfig {
  version: string;
  apiUrl: string;
  clientUrl: string;
  localCompanionUrl: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the `extension/` folder from dev (`server/src`), compiled (`server/dist`),
 * or an explicit `EXTENSION_DIR` override.
 */
export function resolveExtensionDir(): string {
  const candidates = [
    process.env.EXTENSION_DIR,
    path.resolve(__dirname, '../../../extension'),
    path.resolve(process.cwd(), 'extension'),
    path.resolve(process.cwd(), '../extension'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (existsSync(path.join(dir, 'manifest.json'))) {
      return dir;
    }
  }

  throw new Error('Chrome extension source directory not found');
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeOriginPattern(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return null;
  }
}

/**
 * Computes runtime URLs for the Chrome extension from server `.env` variables,
 * optionally falling back to the active HTTP request's protocol + Host header.
 */
export function resolveExtensionRuntimeConfig(requestOriginHint?: {
  protocol?: string;
  host?: string;
}): ExtensionRuntimeConfig {
  const port = process.env.PORT || '3007';
  const companionPort =
    process.env.COMPANION_PORT !== undefined ? Number(process.env.COMPANION_PORT) : 10043;

  const envApiUrl =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.SERVER_URL?.trim() ||
    process.env.API_URL?.trim();

  let apiUrl: string;
  if (envApiUrl) {
    apiUrl = stripTrailingSlash(envApiUrl);
  } else if (requestOriginHint?.host) {
    const proto = requestOriginHint.protocol || 'http';
    apiUrl = `${proto}://${requestOriginHint.host}`;
  } else {
    apiUrl = `http://localhost:${port}`;
  }

  const rawClientUrl = process.env.CLIENT_URL?.trim();
  let clientUrl = 'http://localhost:5173';
  if (rawClientUrl) {
    const firstValid = rawClientUrl
      .split(',')
      .map((s) => s.trim())
      .find((s) => s && s !== '*');
    if (firstValid) {
      clientUrl = stripTrailingSlash(firstValid);
    }
  }

  return {
    version: '1.0.0',
    apiUrl,
    clientUrl,
    localCompanionUrl:
      companionPort > 0 && process.env.ENABLE_COMPANION_LISTENER !== 'false'
        ? `http://localhost:${companionPort}`
        : '',
  };
}

async function collectFilesRecursively(baseDir: string, currentDir = baseDir): Promise<ZipEntryInput[]> {
  const dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
  const results: ZipEntryInput[] = [];

  for (const entry of dirEntries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFilesRecursively(baseDir, fullPath);
      results.push(...nested);
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      const data = await fs.readFile(fullPath);
      const relName = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ name: relName, data, mtime: stat.mtime });
    }
  }

  return results;
}

export async function getExtensionMetadata(requestOriginHint?: {
  protocol?: string;
  host?: string;
}): Promise<ExtensionRuntimeConfig> {
  const extDir = resolveExtensionDir();
  const baseConfig = resolveExtensionRuntimeConfig(requestOriginHint);
  try {
    const manifestRaw = await fs.readFile(path.join(extDir, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw) as { version?: string };
    if (manifest.version) {
      baseConfig.version = manifest.version;
    }
  } catch {
    // Keep default version
  }
  return baseConfig;
}

/**
 * Generates an environment-configured ZIP archive of the Chrome Extension on the fly.
 * Replaces `config.js`, `manifest.json` host_permissions, and `popup/popup.html` links
 * using `PUBLIC_API_URL` and `CLIENT_URL`.
 */
export async function buildConfiguredExtensionZip(requestOriginHint?: {
  protocol?: string;
  host?: string;
}): Promise<{ buffer: Buffer; config: ExtensionRuntimeConfig }> {
  const extDir = resolveExtensionDir();
  const config = await getExtensionMetadata(requestOriginHint);
  const rawEntries = await collectFilesRecursively(extDir);

  let clientHostLabel = 'localhost:5173';
  try {
    clientHostLabel = new URL(config.clientUrl).host;
  } catch {
    // Fallback
  }

  const transformedEntries: ZipEntryInput[] = rawEntries.map((entry) => {
    if (entry.name === 'config.js') {
      const generatedConfig = [
        '// Auto-configured by CodeV Server from environment variables',
        `self.CODEV_DEFAULT_CONFIG = ${JSON.stringify(
          {
            apiUrl: config.apiUrl,
            clientUrl: config.clientUrl,
            localCompanionUrl: config.localCompanionUrl,
          },
          null,
          2
        )};`,
        '',
        'async function getCodevConfig() {',
        '  try {',
        "    const stored = await chrome.storage.sync.get(['codevApiUrl', 'codevClientUrl']);",
        '    return {',
        '      apiUrl: (stored.codevApiUrl || self.CODEV_DEFAULT_CONFIG.apiUrl).replace(/\\/+$/, ""),',
        '      clientUrl: (stored.codevClientUrl || self.CODEV_DEFAULT_CONFIG.clientUrl).replace(/\\/+$/, ""),',
        '      localCompanionUrl: self.CODEV_DEFAULT_CONFIG.localCompanionUrl,',
        '    };',
        '  } catch {',
        '    return { ...self.CODEV_DEFAULT_CONFIG };',
        '  }',
        '}',
        '',
      ].join('\n');

      return {
        ...entry,
        data: Buffer.from(generatedConfig, 'utf8'),
      };
    }

    if (entry.name === 'manifest.json') {
      const manifest = JSON.parse(entry.data.toString('utf8'));
      const perms = new Set<string>(manifest.permissions || []);
      perms.add('activeTab');
      perms.add('storage');
      perms.add('tabs');
      perms.add('scripting');
      manifest.permissions = Array.from(perms);

      const hostPerms = new Set<string>([
        '*://codeforces.com/*',
        '*://*.codeforces.com/*',
        '*://leetcode.com/*',
        '*://*.leetcode.com/*',
      ]);

      const apiPattern = normalizeOriginPattern(config.apiUrl);
      const clientPattern = normalizeOriginPattern(config.clientUrl);
      if (apiPattern) hostPerms.add(apiPattern);
      if (clientPattern) hostPerms.add(clientPattern);

      // Keep local fallback permissions
      hostPerms.add('http://localhost:3007/*');
      hostPerms.add('http://127.0.0.1:3007/*');
      hostPerms.add('http://localhost:5173/*');
      hostPerms.add('http://127.0.0.1:5173/*');
      if (config.localCompanionUrl) {
        const compPattern = normalizeOriginPattern(config.localCompanionUrl);
        if (compPattern) hostPerms.add(compPattern);
        hostPerms.add('http://127.0.0.1:10043/*');
      }

      manifest.host_permissions = Array.from(hostPerms);
      manifest.optional_host_permissions = ['https://*/*', 'http://*/*'];

      return {
        ...entry,
        data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
      };
    }

    if (entry.name === 'popup/popup.html') {
      let html = entry.data.toString('utf8');
      html = html
        .replace(/href="http:\/\/localhost:5173"/g, `href="${config.clientUrl}"`)
        .replace(/Open CodeV Arena \(localhost:5173\)/g, `Open CodeV Arena (${clientHostLabel})`);

      return {
        ...entry,
        data: Buffer.from(html, 'utf8'),
      };
    }

    return entry;
  });

  return {
    buffer: buildZipArchive(transformedEntries),
    config,
  };
}
