import { describe, expect, it } from 'vitest';
import { describeConnectionFailure } from '../connectionError.js';

// P134：修正「所有 404 都被說成網址錯」的誤導文案。純函式測試，零網路。
describe('describeConnectionFailure', () => {
  it('401 沿用金鑰錯誤文案（迴歸鎖）', () => {
    expect(describeConnectionFailure({
      status: 401,
      raw: 'Unauthorized',
      data: { error: { message: 'Unauthorized' } },
      modelId: 'gpt-5.4-mini',
      baseKind: 'default',
    })).toBe('API 金鑰錯誤，請確認是否填對、或帳號是否仍有效');
  });

  it('raw 含 invalid 與 key 也判為金鑰錯誤（迴歸鎖）', () => {
    expect(describeConnectionFailure({
      status: 400,
      raw: 'invalid api key provided',
      data: { error: { message: 'invalid api key provided' } },
      modelId: 'gpt-5.4-mini',
      baseKind: 'default',
    })).toBe('API 金鑰錯誤，請確認是否填對、或帳號是否仍有效');
  });

  it('429 沿用額度用盡文案（迴歸鎖）', () => {
    expect(describeConnectionFailure({
      status: 429,
      raw: 'rate limit exceeded',
      data: { error: { message: 'rate limit exceeded' } },
      modelId: 'gemini-3.5-flash',
      baseKind: 'default',
    })).toBe('請求次數超限或額度用完，請稍後再試或確認帳號餘額');
  });

  it('403 沿用權限不足文案（迴歸鎖）', () => {
    expect(describeConnectionFailure({
      status: 403,
      raw: 'forbidden',
      data: { error: { message: 'forbidden' } },
      modelId: 'claude-sonnet-5',
      baseKind: 'default',
    })).toBe('金鑰無此模型的使用權限，請確認模型 ID 或帳號方案');
  });

  it('404 + 回應不是 JSON（閘道頁/HTML）→ 沿用網址文案', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: '<!DOCTYPE html><html>...</html>',
      data: null,
      modelId: 'gpt-5.4-mini',
      baseKind: 'custom',
    })).toBe('找不到這個 API 位址，請確認自訂網址是否正確（需包含 /v1）');
  });

  it('404 + 訊息回述 modelId → 模型文案（不論是否自訂網址）', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: 'models/gemini-3.5-flash is not found for API version v1beta',
      data: { error: { message: 'models/gemini-3.5-flash is not found for API version v1beta' } },
      modelId: 'gemini-3.5-flash',
      baseKind: 'default',
    })).toBe('找不到模型「gemini-3.5-flash」——可能已下架、拼錯，或這把金鑰沒有它的權限。請換一個模型再試。');
  });

  it('404 + 用預設網址 + 訊息沒點出模型 → 仍判為模型文案（不可能是自訂網址錯）', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: 'not found',
      data: { error: { message: 'not found' } },
      modelId: 'gemini-3.5-flash',
      baseKind: 'default',
    })).toBe('找不到模型「gemini-3.5-flash」——可能已下架、拼錯，或這把金鑰沒有它的權限。請換一個模型再試。');
  });

  it('404 + 有自訂網址 + 訊息沒點出模型 → 不確定文案', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: 'not found',
      data: { error: { message: 'not found' } },
      modelId: 'gpt-4o-mini',
      baseKind: 'custom',
    })).toBe('HTTP 404：可能是模型「gpt-4o-mini」不存在，也可能是自訂網址不正確。先換個模型試試，仍失敗再檢查網址。');
  });

  it('404 + modelId 為空 + 用預設網址 → 模型文案省略引號部分', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: 'not found',
      data: { error: { message: 'not found' } },
      modelId: '',
      baseKind: 'default',
    })).toBe('找不到指定的模型');
  });

  it('404 的模型比對不分大小寫', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: 'Model GEMINI-3.5-FLASH not found',
      data: { error: { message: 'Model GEMINI-3.5-FLASH not found' } },
      modelId: 'gemini-3.5-flash',
      baseKind: 'custom',
    })).toBe('找不到模型「gemini-3.5-flash」——可能已下架、拼錯，或這把金鑰沒有它的權限。請換一個模型再試。');
  });

  it('其他狀態碼原樣回傳 raw，沒有 raw 就回 HTTP 狀態碼', () => {
    expect(describeConnectionFailure({
      status: 500,
      raw: 'internal server error',
      data: { error: { message: 'internal server error' } },
      modelId: 'gpt-5.4-mini',
      baseKind: 'default',
    })).toBe('internal server error');

    expect(describeConnectionFailure({
      status: 500,
      raw: '',
      data: null,
      modelId: 'gpt-5.4-mini',
      baseKind: 'default',
    })).toBe('HTTP 500');
  });

  it('缺參數呼叫也不拋錯（防呆）', () => {
    expect(() => describeConnectionFailure({})).not.toThrow();
    expect(() => describeConnectionFailure()).not.toThrow();
  });

  // baseKind: 'app-built'——網址由程式自己組（如 Vertex，project_id 嵌在路徑裡）。
  // 404 不一定是模型問題（也可能是 project_id 錯），不接受「網址／模型」二選一用猜的：
  // 訊息點名模型才判定模型問題，否則原樣回傳供應商訊息，不可換成我們自己編的文案。
  describe('baseKind: app-built（網址由程式自己組，如 Vertex）', () => {
    it('訊息回述 modelId → 模型文案', () => {
      expect(describeConnectionFailure({
        status: 404,
        raw: 'Publisher Model `projects/my-proj/locations/us-central1/publishers/google/models/gemini-2.5-pro` not found.',
        data: { error: { message: 'Publisher Model not found' } },
        modelId: 'gemini-2.5-pro',
        baseKind: 'app-built',
      })).toBe('找不到模型「gemini-2.5-pro」——可能已下架、拼錯，或這把金鑰沒有它的權限。請換一個模型再試。');
    });

    it('訊息只提到專案、不含 modelId → 原樣回傳 raw（不可臆測成模型或網址問題）', () => {
      const raw = 'Project `my-nonexistent-project` not found or permission denied.';
      expect(describeConnectionFailure({
        status: 404,
        raw,
        data: { error: { message: raw } },
        modelId: 'gemini-2.5-pro',
        baseKind: 'app-built',
      })).toBe(raw);
    });

    it('data 為 null（非 JSON 回應）→ 仍原樣回傳 raw，不套用網址文案', () => {
      const raw = 'not found';
      expect(describeConnectionFailure({
        status: 404,
        raw,
        data: null,
        modelId: 'gemini-2.5-pro',
        baseKind: 'app-built',
      })).toBe(raw);
    });
  });

  it('custom + modelId 為空 → 不確定文案不含空引號', () => {
    expect(describeConnectionFailure({
      status: 404,
      raw: 'not found',
      data: { error: { message: 'not found' } },
      modelId: '',
      baseKind: 'custom',
    })).toBe('HTTP 404：可能是指定的模型不存在，也可能是自訂網址不正確。先換個模型試試，仍失敗再檢查網址。');
  });
});
