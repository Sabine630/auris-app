import { describe, it, expect } from 'vitest';
import { getCyclePhase } from '../cycle.js';

describe('getCyclePhase', () => {
  it('無設定回 null', () => {
    expect(getCyclePhase(null)).toBe(null);
    expect(getCyclePhase({ cycleEnabled: false })).toBe(null);
    expect(getCyclePhase({ cycleEnabled: true })).toBe(null); // 缺 lastPeriodStart
  });

  it('開始日填在未來回 null', () => {
    const me = { cycleEnabled: true, lastPeriodStart: '2026-06-20' };
    const now = new Date(2026, 5, 15); // now 早於開始日
    expect(getCyclePhase(me, now)).toBe(null);
  });

  it('經期第 1 天：phase=period、dayNum=1、daysUntilNext=0', () => {
    const me = { cycleEnabled: true, lastPeriodStart: '2026-06-15' };
    const now = new Date(2026, 5, 15);
    const ph = getCyclePhase(me, now);
    expect(ph.phase).toBe('period');
    expect(ph.dayNum).toBe(1);
    expect(ph.dayInCycle).toBe(0);
    expect(ph.daysUntilNext).toBe(0);
  });

  it('經期前 2 天：phase=pms、daysUntilNext=2', () => {
    // 週期 28、開始日 26 天前 → dayInCycle 26、daysUntilNext 2
    const me = { cycleEnabled: true, lastPeriodStart: '2026-06-01' };
    const now = new Date(2026, 5, 27);
    const ph = getCyclePhase(me, now);
    expect(ph.phase).toBe('pms');
    expect(ph.daysUntilNext).toBe(2);
  });

  it('經期中第 3 天仍為 period', () => {
    const me = { cycleEnabled: true, lastPeriodStart: '2026-06-01' };
    const now = new Date(2026, 5, 3); // 第 3 天（0-based dayInCycle=2）
    const ph = getCyclePhase(me, now);
    expect(ph.phase).toBe('period');
    expect(ph.dayNum).toBe(3);
  });
});
