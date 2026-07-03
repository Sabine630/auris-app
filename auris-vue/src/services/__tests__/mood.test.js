import { describe, it, expect } from 'vitest';
import { moodContext } from '../mood.js';

describe('moodContext', () => {
  it('無打卡（null）回空字串', () => {
    expect(moodContext(null)).toBe('');
  });

  it('未知 mood key 回空字串', () => {
    expect(moodContext({ mood: 'nonexistent' })).toBe('');
  });

  it('有心情、無備註：含心情標籤、不含備註句', () => {
    const out = moodContext({ mood: 'happy' });
    expect(out).toContain('開心');
    expect(out).not.toContain('並寫下');
  });

  it('有備註：含「並寫下：「...」」', () => {
    const out = moodContext({ mood: 'down', note: '報告被退回' });
    expect(out).toContain('低落');
    expect(out).toContain('並寫下：「報告被退回」');
  });

  it('空備註視同無備註', () => {
    const out = moodContext({ mood: 'tired', note: '' });
    expect(out).not.toContain('並寫下');
  });
});
