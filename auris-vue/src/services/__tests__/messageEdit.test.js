import { describe, it, expect } from 'vitest';
import { applyMessageEdit } from '../messageEdit.js';

function baseMsg(overrides = {}) {
  return {
    id: 'msg_1',
    role: 'assistant',
    content: '生日是九月八號喔',
    createdAt: 12345,
    charId: 'c1',
    type: 'text',
    reaction: '❤️',
    ...overrides,
  };
}

describe('applyMessageEdit', () => {
  it('正常編輯 → 回新物件，content 為 trim 後的值', () => {
    const msg = baseMsg();
    const result = applyMessageEdit(msg, '  生日是九月三號喔  ');
    expect(result).not.toBeNull();
    expect(result.content).toBe('生日是九月三號喔');
  });

  it('只有前後空白差異 → 回 null（視為沒變更）', () => {
    const msg = baseMsg({ content: '生日是九月三號喔' });
    expect(applyMessageEdit(msg, '  生日是九月三號喔  ')).toBeNull();
  });

  it('空字串 → 回 null', () => {
    expect(applyMessageEdit(baseMsg(), '')).toBeNull();
  });

  it('只有空白 → 回 null', () => {
    expect(applyMessageEdit(baseMsg(), '   ')).toBeNull();
  });

  it('只有換行 → 回 null', () => {
    expect(applyMessageEdit(baseMsg(), '\n\n\t')).toBeNull();
  });

  it('內容完全相同 → 回 null', () => {
    const msg = baseMsg({ content: '一模一樣的內容' });
    expect(applyMessageEdit(msg, '一模一樣的內容')).toBeNull();
  });

  // 陣列刻意列進來：它的 typeof 是 'object'，不特別擋就會被 { ...msg } 展開成
  // 只有 content 的垃圾物件（驗收時實測出來的）。
  it.each([null, undefined, 'a string', 123, [], ['x']])('msg 非物件（%s）→ 回 null 不拋錯', (bad) => {
    expect(() => applyMessageEdit(bad, '新內容')).not.toThrow();
    expect(applyMessageEdit(bad, '新內容')).toBeNull();
  });

  it.each([{ a: 1 }, 123, null, undefined])('newContent 非字串（%s）→ 回 null 不拋錯', (bad) => {
    const msg = baseMsg();
    expect(() => applyMessageEdit(msg, bad)).not.toThrow();
    expect(applyMessageEdit(msg, bad)).toBeNull();
  });

  it('其他欄位保持原樣', () => {
    const msg = baseMsg();
    const result = applyMessageEdit(msg, '新的正確內容');
    expect(result.id).toBe(msg.id);
    expect(result.role).toBe(msg.role);
    expect(result.createdAt).toBe(msg.createdAt);
    expect(result.charId).toBe(msg.charId);
    expect(result.type).toBe(msg.type);
    expect(result.reaction).toBe(msg.reaction);
  });

  it('原物件不被就地修改（無副作用）', () => {
    const msg = baseMsg({ content: '原本的內容' });
    const snapshot = { ...msg };
    applyMessageEdit(msg, '改過的內容');
    expect(msg).toEqual(snapshot);
    expect(msg.content).toBe('原本的內容');
  });
});
