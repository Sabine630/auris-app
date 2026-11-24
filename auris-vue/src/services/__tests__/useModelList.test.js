import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, nextTick } from 'vue';

// useModelList：金鑰輸入中不發請求、完整後 debounce 才發一次、換供應商丟舊清單。

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
vi.mock('../db.js', () => ({ getSetting: vi.fn() }));
vi.mock('../diag.js', () => ({ logError: vi.fn(), sanitizeCode: (s) => s }));

const { useModelList } = await import('../../composables/useModelList.js');
const { clearModelListCache } = await import('../modelCatalog.js');

const FULL = 'sk-test-0123456789abcdefghij';

beforeEach(() => { vi.useFakeTimers(); clearModelListCache(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function setup() {
  const provider = ref('openai');
  const apiKey = ref('');
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [{ id: 'gpt-9-new' }] }) }));
  vi.stubGlobal('fetch', fetchMock);
  const api = useModelList({ provider: () => provider.value, apiKey: () => apiKey.value, selected: () => 'gpt-5.4-mini' });
  return { provider, apiKey, fetchMock, ...api };
}

describe('useModelList', () => {
  it('金鑰不完整時，逐字輸入全程不發請求', async () => {
    const { apiKey, fetchMock } = setup();
    for (const n of [1, 5, 10, 19]) {
      apiKey.value = FULL.slice(0, n);
      await nextTick();
      await vi.advanceTimersByTimeAsync(2000);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('金鑰補齊後 debounce 只發一次，清單含新模型且保留已選款', async () => {
    const { apiKey, fetchMock, models } = setup();
    apiKey.value = FULL.slice(0, 5); await nextTick();
    apiKey.value = FULL; await nextTick();
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const ids = models.value.map(m => m.id);
    expect(ids).toContain('gpt-9-new');
    expect(ids).toContain('gpt-5.4-mini');
  });

  it('金鑰又被刪短：丟掉動態清單退回內建', async () => {
    const { apiKey, models } = setup();
    apiKey.value = FULL; await nextTick();
    await vi.advanceTimersByTimeAsync(1500);
    expect(models.value.map(m => m.id)).toContain('gpt-9-new');
    apiKey.value = FULL.slice(0, 5); await nextTick();
    expect(models.value.map(m => m.id)).not.toContain('gpt-9-new');
  });
});
