import { dbAll, dbDel, dbPut, getSetting, setSetting } from './db.js';
import { localDateKey } from './date.js';
import {
  backfillClosedAtPatch,
  classifyThreadCleanup,
  expirePatch,
} from './continuity.js';

export const CONTINUITY_CLEANUP_KEY = 'continuity_cleanup_date';

// 每日一次維護待續事件。完成整輪後才寫日期；中途失敗時下次開 App 會重試。
export async function runContinuityCleanup(nowMs = Date.now()) {
  const today = localDateKey(new Date(nowMs));
  if (await getSetting(CONTINUITY_CLEANUP_KEY) === today) {
    return { skipped: true, expired: 0, purged: 0, backfilled: 0 };
  }

  const stats = { skipped: false, expired: 0, purged: 0, backfilled: 0 };
  for (const thread of await dbAll('continuity_threads')) {
    const action = classifyThreadCleanup(thread, nowMs);
    if (action === 'expire') {
      await dbPut('continuity_threads', { ...thread, ...expirePatch(nowMs) });
      stats.expired++;
    } else if (action === 'purge') {
      await dbDel('continuity_threads', thread.id);
      stats.purged++;
    } else if (action === 'backfill-closed') {
      await dbPut('continuity_threads', {
        ...thread,
        ...backfillClosedAtPatch(thread, nowMs),
      });
      stats.backfilled++;
    }
  }
  await setSetting(CONTINUITY_CLEANUP_KEY, today);
  return stats;
}
