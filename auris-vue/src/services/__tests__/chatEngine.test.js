import { describe, it, expect, vi, afterEach } from 'vitest';
import { dayPeriod, timeAnchorLine, shouldBusyRead } from '../chatEngine.js';

describe('dayPeriod — 時段分界', () => {
  it('4→深夜、5→清晨（清晨下界）', () => {
    expect(dayPeriod(4)).toBe('深夜');
    expect(dayPeriod(5)).toBe('清晨');
  });

  it('22→晚上、23→深夜（深夜上界）', () => {
    expect(dayPeriod(22)).toBe('晚上');
    expect(dayPeriod(23)).toBe('深夜');
  });

  it('其餘時段', () => {
    expect(dayPeriod(0)).toBe('深夜');
    expect(dayPeriod(7)).toBe('清晨');
    expect(dayPeriod(10)).toBe('早上');
    expect(dayPeriod(12)).toBe('中午');
    expect(dayPeriod(16)).toBe('下午');
    expect(dayPeriod(18)).toBe('傍晚');
  });
});

describe('timeAnchorLine', () => {
  afterEach(() => vi.useRealTimers());

  it('格式：M/D（星期X）時段 HH:MM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 7, 24)); // 6/24 07:24
    const line = timeAnchorLine();
    expect(line).toMatch(/^\d{1,2}\/\d{1,2}（星期[日一二三四五六]）.+\s\d{2}:\d{2}$/);
    expect(line).toContain('6/24');
    expect(line).toContain('清晨'); // dayPeriod(7)
    expect(line).toContain('07:24');
  });
});

describe('shouldBusyRead', () => {
  afterEach(() => vi.restoreAllMocks());

  it('busyRead 關閉必 false', () => {
    expect(shouldBusyRead({ busyRead: false }, new Date(2026, 5, 15, 12, 0))).toBe(false);
    expect(shouldBusyRead({}, new Date(2026, 5, 15, 12, 0))).toBe(false);
  });

  it('深夜（23–8 點）必 false', () => {
    expect(shouldBusyRead({ busyRead: true }, new Date(2026, 5, 15, 2, 0))).toBe(false);
    expect(shouldBusyRead({ busyRead: true }, new Date(2026, 5, 15, 23, 30))).toBe(false);
  });

  it('無 workTime：基礎機率 0.15 分界', () => {
    const c = { busyRead: true };
    const noon = new Date(2026, 5, 15, 12, 0);
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.15
    expect(shouldBusyRead(c, noon)).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.2); // > 0.15
    expect(shouldBusyRead(c, noon)).toBe(false);
  });

  it('workTime 視窗內：機率提高到 0.4', () => {
    const c = { busyRead: true, workTime: '09:00-18:00' };
    const noon = new Date(2026, 5, 15, 12, 0); // 視窗內
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // < 0.4 但 > 0.15
    expect(shouldBusyRead(c, noon)).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // > 0.4
    expect(shouldBusyRead(c, noon)).toBe(false);
  });

  it('workTime 視窗外：回落基礎 0.15', () => {
    const c = { busyRead: true, workTime: '09:00-18:00' };
    const evening = new Date(2026, 5, 15, 20, 0); // 視窗外、非深夜
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // > 0.15 → false
    expect(shouldBusyRead(c, evening)).toBe(false);
  });

  it('跨夜 workTime（20:00-04:00）解析正確', () => {
    const c = { busyRead: true, workTime: '20:00-04:00' };
    const night = new Date(2026, 5, 15, 21, 0); // 21 點在跨夜視窗內、且非深夜（<23）
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // < 0.4 → true 證明判定為視窗內
    expect(shouldBusyRead(c, night)).toBe(true);
  });
});
