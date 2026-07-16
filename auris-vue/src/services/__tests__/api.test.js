import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SA = {
  project_id: 'project-a',
  client_email: 'a@example.test',
  private_key: 'AQID', // 明確假 fixture；避免測試檔出現真私鑰 header 形狀
};

function installCryptoMock() {
  vi.stubGlobal('crypto', {
    subtle: {
      // 測試只需要穩定且能區分輸入；正式環境使用 Web Crypto SHA-256。
      digest: vi.fn(async (_algorithm, input) => new Uint8Array(input).slice().buffer),
      importKey: vi.fn(async () => ({})),
      sign: vi.fn(async () => Uint8Array.from([1, 2, 3]).buffer),
    },
  });
}

function tokenResponse(token, expiresIn = 3600) {
  return {
    status: 200,
    json: async () => ({ access_token: token, expires_in: expiresIn }),
  };
}

async function freshGetVertexToken() {
  vi.resetModules();
  return (await import('../api.js')).getVertexToken;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-15T00:00:00Z'));
  installCryptoMock();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getVertexToken — service account cache isolation', () => {
  it('相同 service account 在有效期內共用 token', async () => {
    fetch.mockResolvedValue(tokenResponse('token-a'));
    const getVertexToken = await freshGetVertexToken();

    await expect(getVertexToken(SA)).resolves.toBe('token-a');
    await expect(getVertexToken({ ...SA })).resolves.toBe('token-a');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('不同 service account 不共用 token', async () => {
    fetch
      .mockResolvedValueOnce(tokenResponse('token-a'))
      .mockResolvedValueOnce(tokenResponse('token-b'));
    const getVertexToken = await freshGetVertexToken();

    await expect(getVertexToken(SA)).resolves.toBe('token-a');
    await expect(getVertexToken({ ...SA, client_email: 'b@example.test' })).resolves.toBe('token-b');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('同帳號更換 private key 時不共用 token', async () => {
    fetch
      .mockResolvedValueOnce(tokenResponse('token-a'))
      .mockResolvedValueOnce(tokenResponse('token-new-key'));
    const getVertexToken = await freshGetVertexToken();

    await getVertexToken(SA);
    await expect(getVertexToken({
      ...SA,
      private_key: 'BAUG',
    })).resolves.toBe('token-new-key');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('依 expires_in 並預留安全緩衝，到期後重新取得', async () => {
    fetch
      .mockResolvedValueOnce(tokenResponse('token-a', 120))
      .mockResolvedValueOnce(tokenResponse('token-b', 120));
    const getVertexToken = await freshGetVertexToken();

    await expect(getVertexToken(SA)).resolves.toBe('token-a');
    vi.advanceTimersByTime(107_000);
    await expect(getVertexToken(SA)).resolves.toBe('token-a');
    vi.advanceTimersByTime(2_000);
    await expect(getVertexToken(SA)).resolves.toBe('token-b');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
