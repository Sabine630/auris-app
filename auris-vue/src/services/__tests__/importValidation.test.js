import { describe, it, expect, vi } from 'vitest';
import {
  IMPORT_LIMITS,
  MAX_TEXT_FIELD_CHARS,
  STORE_RECORD_LIMITS,
  assertImportFileSize,
  inspectRasterDataUrl,
  isSafeRasterDataUrl,
  readImportJsonFile,
  validateChatImport,
  validateImportResources,
  validateStoreRows,
} from '../importValidation.js';

const PNG_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const JPEG_HEADER = 'data:image/jpeg;base64,/9j/4AAQ';
const WEBP_HEADER = 'data:image/webp;base64,UklGRgAAAABXRUJQ';

describe('匯入檔案讀取上限', () => {
  it('在 file.text() 前拒絕超過上限的完整備份', async () => {
    const text = vi.fn(async () => '{}');
    const file = { size: IMPORT_LIMITS.backup.fileBytes + 1, text };

    await expect(readImportJsonFile(file, 'backup')).rejects.toThrow(/64 MB/);
    expect(text).not.toHaveBeenCalled();
  });

  it('空檔與損毀 JSON 會回傳可理解的錯誤', async () => {
    expect(() => assertImportFileSize({ size: 0 }, 'chat')).toThrow(/空的/);
    await expect(readImportJsonFile({ size: 3, text: async () => '{x}' }, 'chat'))
      .rejects.toThrow(/JSON 檔案格式錯誤/);
  });
});

describe('raster data URL 驗證', () => {
  it('接受 JPEG／PNG／WebP base64，並核對真實檔頭', () => {
    expect(isSafeRasterDataUrl(JPEG_HEADER)).toBe(true);
    expect(isSafeRasterDataUrl(PNG_DATA)).toBe(true);
    expect(isSafeRasterDataUrl(WEBP_HEADER)).toBe(true);
  });

  it('拒絕 SVG、非 base64、偽造 MIME 與外部 URL', () => {
    expect(isSafeRasterDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeRasterDataUrl('data:image/png,raw')).toBe(false);
    expect(isSafeRasterDataUrl('data:image/jpeg;base64,iVBORw0KGgo=')).toBe(false);
    expect(isSafeRasterDataUrl('https://tracker.example/pixel.png')).toBe(false);
  });

  it('依解碼後 bytes 執行單張圖片容量限制', () => {
    expect(inspectRasterDataUrl(PNG_DATA, 4)).toMatchObject({ safe: false, reason: 'size' });
  });
});

describe('JSON 資源與 v1 schema 驗證', () => {
  it('拒絕超長單一文字欄位', () => {
    expect(() => validateImportResources({ content: '字'.repeat(MAX_TEXT_FIELD_CHARS + 1) }, 'chat'))
      .toThrow(/文字過長/);
  });

  it('拒絕 store 超量筆數，不需逐筆解析', () => {
    const rows = Array(STORE_RECORD_LIMITS.messages + 1).fill({});
    expect(() => validateStoreRows('messages', rows)).toThrow(/筆數超過上限/);
  });

  it('拒絕重複 key、錯誤核心欄位與錯誤時間型別', () => {
    const good = { id: 'm1', charId: 'c1', role: 'user', content: 'hi', createdAt: 1 };
    expect(() => validateStoreRows('messages', [good, { ...good }])).toThrow(/重複/);
    expect(() => validateStoreRows('messages', [{ ...good, role: 'system' }])).toThrow(/role/);
    expect(() => validateStoreRows('messages', [{ ...good, createdAt: '昨天' }])).toThrow(/createdAt/);
  });

  it('聊天匯入先驗證整包後才交給 View 寫入', () => {
    const payload = {
      aurisChatExportVersion: 1,
      messages: [{ id: 'm1', charId: 'source', role: 'assistant', content: '安全', image: PNG_DATA, createdAt: 1 }],
    };
    expect(validateChatImport(payload)).toEqual(payload.messages);
    expect(() => validateChatImport({ ...payload, messages: [{ ...payload.messages[0], content: 123 }] }))
      .toThrow(/content/);
  });
});
