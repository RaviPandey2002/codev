import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { buildZipArchive } from '../utils/zip.js';
import {
  buildConfiguredExtensionZip,
  resolveExtensionDir,
  resolveExtensionRuntimeConfig,
} from '../services/extension_packager.service.js';

function parseZipEntriesForTest(zipBuf: Buffer): Record<string, Buffer> {
  const entries: Record<string, Buffer> = {};
  let offset = 0;

  while (offset + 4 <= zipBuf.length) {
    const sig = zipBuf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const method = zipBuf.readUInt16LE(offset + 8);
    const compressedSize = zipBuf.readUInt32LE(offset + 18);
    const uncompressedSize = zipBuf.readUInt32LE(offset + 22);
    const nameLen = zipBuf.readUInt16LE(offset + 26);
    const extraLen = zipBuf.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const name = zipBuf.subarray(nameStart, nameStart + nameLen).toString('utf8');
    const dataStart = nameStart + nameLen + extraLen;
    const rawSlice = zipBuf.subarray(dataStart, dataStart + compressedSize);

    const content = method === 8 ? inflateRawSync(rawSlice) : Buffer.from(rawSlice);
    assert.equal(content.length, uncompressedSize, `Size mismatch for entry ${name}`);
    entries[name] = content;

    offset = dataStart + compressedSize;
  }

  return entries;
}

describe('Extension Packager & Dynamic Env Injection', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds a valid PKZIP archive from arbitrary buffers', () => {
    const zip = buildZipArchive([
      { name: 'hello.txt', data: Buffer.from('Hello CodeV! '.repeat(20), 'utf8') },
      { name: 'nested/data.json', data: Buffer.from('{"ok":true}', 'utf8') },
    ]);

    // Check PK local header magic & EOCD signature
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);

    const parsed = parseZipEntriesForTest(zip);
    assert.equal(parsed['hello.txt'].toString('utf8'), 'Hello CodeV! '.repeat(20));
    assert.equal(parsed['nested/data.json'].toString('utf8'), '{"ok":true}');
  });

  it('resolves extension directory containing manifest.json', () => {
    const dir = resolveExtensionDir();
    assert.ok(dir.endsWith('extension'));
  });

  it('injects PUBLIC_API_URL and CLIENT_URL env vars into packaged extension zip', async () => {
    process.env.PUBLIC_API_URL = 'https://api.codev-live.example.com/';
    process.env.CLIENT_URL = 'https://codev-live.example.com/';
    process.env.ENABLE_COMPANION_LISTENER = 'false';

    const cfg = resolveExtensionRuntimeConfig();
    assert.equal(cfg.apiUrl, 'https://api.codev-live.example.com');
    assert.equal(cfg.clientUrl, 'https://codev-live.example.com');
    assert.equal(cfg.localCompanionUrl, '');

    const { buffer, config } = await buildConfiguredExtensionZip();
    assert.equal(config.apiUrl, 'https://api.codev-live.example.com');
    assert.equal(config.clientUrl, 'https://codev-live.example.com');

    const entries = parseZipEntriesForTest(buffer);
    assert.ok(entries['config.js']);
    assert.ok(entries['manifest.json']);
    assert.ok(entries['popup/popup.html']);
    assert.ok(entries['background/service-worker.js']);
    assert.ok(entries['content/codeforces.js']);
    assert.ok(entries['content/leetcode.js']);

    const configText = entries['config.js'].toString('utf8');
    assert.ok(configText.includes('https://api.codev-live.example.com'));
    assert.ok(configText.includes('https://codev-live.example.com'));

    const manifest = JSON.parse(entries['manifest.json'].toString('utf8'));
    assert.ok(manifest.permissions.includes('tabs'));
    assert.ok(manifest.permissions.includes('scripting'));
    assert.ok(manifest.host_permissions.includes('https://api.codev-live.example.com/*'));
    assert.ok(manifest.host_permissions.includes('https://codev-live.example.com/*'));

    const popupHtml = entries['popup/popup.html'].toString('utf8');
    assert.ok(popupHtml.includes('href="https://codev-live.example.com"'));
    assert.ok(popupHtml.includes('Open CodeV Arena (codev-live.example.com)'));
  });
});
