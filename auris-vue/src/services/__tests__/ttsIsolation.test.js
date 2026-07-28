// 角色語音批次 A：金鑰與角色聲音綁定的匯出／匯入隔離。
// 對應派工單「批次 A 必交測試」第 8、9 條——跑在 fake-indexeddb 上，驗的是
// 實際落庫與實際匯出物，不是函式回傳值。
//
// 威脅：備份檔可被分享或竄改。若匯入接受 voiceProfile／tts_providers，攻擊者
// 就能把使用者的角色綁到自己的 voiceId、或把本機的服務商設定換掉。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));

import {
  initDB, dbPut, dbGet, dbAll, getSetting, setSetting,
  exportAllData, importAllData, exportCharacterData, importCharacterData,
} from '../db.js';
import { exportDiag } from '../diag.js';

const FAKE_KEY = 'xi-demo-not-a-real-key';
const VOICE_PROFILE = {
  enabled: true, provider: 'elevenlabs', voiceId: 'JBFqnCBsd6RMkjVDRZzb',
  voiceName: 'George', model: 'eleven_flash_v2_5', speed: 1,
  settings: { stability: 0.5, similarity: 0.75 }, verifiedAt: 123,
};
const TTS_SETTINGS = {
  elevenlabs: { enabled: true, apiKey: FAKE_KEY, model: 'eleven_flash_v2_5', connectedAt: 1, lastValidatedAt: 2 },
};

// 這些字串出現在任何可分享的輸出裡就算失敗。
const FORBIDDEN = [FAKE_KEY, 'JBFqnCBsd6RMkjVDRZzb', 'eleven_flash_v2_5', 'api.elevenlabs.io'];

function expectNoVoiceSecrets(payload, label) {
  const dump = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const needle of FORBIDDEN) {
    expect(dump, `${label} 不得含「${needle}」`).not.toContain(needle);
  }
}

function makeBackup(overrides = {}) {
  const data = {
    characters: [], messages: [], memories: [], moments: [], diary: [], dreams: [],
    worlds: [], groups: [], group_messages: [], notifications: [], settings: [],
    ...overrides,
  };
  return { aurisExportVersion: 1, exportDate: Date.now(), data };
}

// exportDiag 依賴瀏覽器全域（localStorage 存錯誤 ring buffer、navigator/screen 進標頭）。
// node 環境沒有這些，補最小替身即可——這裡驗的是「輸出內容不含語音機密」，不是排版。
function stubBrowserGlobals() {
  const mem = new Map();
  vi.stubGlobal('localStorage', {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k),
    clear: () => mem.clear(),
  });
  vi.stubGlobal('navigator', { userAgent: 'test-agent' });
  vi.stubGlobal('screen', { width: 393, height: 852 });
  vi.stubGlobal('window', { devicePixelRatio: 3, innerWidth: 393, innerHeight: 852, matchMedia: () => ({ matches: false }), navigator: { standalone: false } });
}

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  await initDB();
  stubBrowserGlobals();
});

// ⑧ 全域備份、角色匯出與診斷匯出中不存在 TTS Key、端點、provider、voice ID、
//    供應商模型或帳戶識別
describe('⑧ 匯出不得攜帶語音機密', () => {
  beforeEach(async () => {
    await setSetting('tts_providers', TTS_SETTINGS);
    await dbPut('characters', { id: 'c1', name: '夜雨', voiceProfile: { ...VOICE_PROFILE } });
  });

  it('全域備份：settings 無 tts_providers，characters 無 voiceProfile', async () => {
    const backup = await exportAllData();
    expect(backup.data.settings.find(r => r.key === 'tts_providers')).toBeUndefined();
    expect(backup.data.characters[0]).not.toHaveProperty('voiceProfile');
    expect(backup.data.characters[0].name).toBe('夜雨');   // 其餘欄位照常帶走
    expectNoVoiceSecrets(backup, '全域備份');
  });

  it('單角色匯出：character 無 voiceProfile', async () => {
    const dump = await exportCharacterData('c1');
    expect(dump.character).not.toHaveProperty('voiceProfile');
    expectNoVoiceSecrets(dump, '單角色匯出');
  });

  it('診斷匯出不含語音金鑰、端點或 voice ID', async () => {
    const text = await exportDiag();
    expectNoVoiceSecrets(text, '診斷匯出');
  });

  it('剝除是建立新物件，不動資料庫裡的原始角色', async () => {
    await exportAllData();
    await exportCharacterData('c1');
    expect((await dbGet('characters', 'c1')).voiceProfile).toEqual(VOICE_PROFILE);
  });
});

// ⑨ 不允許角色匯入或全系統還原資料寫入、覆蓋任何語音 API、角色聲音綁定或服務商 origin
describe('⑨ 匯入不得寫入或覆蓋語音設定', () => {
  it('全系統還原：人為塞入的 tts_providers 與 voiceProfile 都被丟棄', async () => {
    await setSetting('tts_providers', TTS_SETTINGS);   // 本機既有設定
    const hostile = makeBackup({
      characters: [{ id: 'c9', name: '入侵者', voiceProfile: { ...VOICE_PROFILE, voiceId: 'attackerVoice' } }],
      settings: [{ key: 'tts_providers', value: { elevenlabs: { apiKey: 'attacker-key', baseUrl: 'https://attacker.test' } } }],
    });

    await importAllData(hostile);

    const restored = await dbGet('characters', 'c9');
    expect(restored).not.toHaveProperty('voiceProfile');
    // 本機原有設定必須原封不動——不被覆蓋，也不因還原而消失
    expect(await getSetting('tts_providers')).toEqual(TTS_SETTINGS);
  });

  it('全系統還原後，資料庫裡任何角色都不存在 voiceProfile', async () => {
    await importAllData(makeBackup({
      characters: [
        { id: 'a', name: 'A', voiceProfile: { ...VOICE_PROFILE } },
        { id: 'b', name: 'B', voiceProfile: { ...VOICE_PROFILE } },
      ],
    }));
    for (const c of await dbAll('characters')) expect(c).not.toHaveProperty('voiceProfile');
  });

  it('單角色匯入：voiceProfile 被丟棄，其餘欄位照常寫入', async () => {
    await importCharacterData({
      aurisCharExportVersion: 1,
      character: { id: 'x', name: '匯入角色', persona: '話少', voiceProfile: { ...VOICE_PROFILE } },
      messages: [], memories: [], chatMems: [], moments: [],
      diary: [], dreams: [], wishes: [], notes: [], threads: [],
    });
    const [char] = (await dbAll('characters')).filter(c => c.name.includes('匯入角色'));
    expect(char).toBeTruthy();
    expect(char).not.toHaveProperty('voiceProfile');
    expect(char.persona).toBe('話少');
  });

  it('匯入檔的服務商 origin 不會成為本機設定的一部分', async () => {
    await importAllData(makeBackup({
      settings: [{ key: 'tts_providers', value: { elevenlabs: { baseUrl: 'https://attacker.test' } } }],
    }));
    const dump = JSON.stringify(await getSetting('tts_providers') ?? null);
    expect(dump).not.toContain('attacker.test');
  });
});
