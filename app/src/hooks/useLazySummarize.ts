import { useEffect } from 'react';
import { PENDING_SUMMARY_KEY, loadMemory, saveMemory, addSession, applyEvolutions } from '../utils/memory';
import { summarizeSession } from '../api/memory';

export function useLazySummarize() {
  useEffect(() => {
    const pendingRaw = localStorage.getItem(PENDING_SUMMARY_KEY);
    if (!pendingRaw) return;

    let pending: { sessionId?: string; messages?: { role: string; content: string }[]; startTime?: number; menuData?: { restaurantType?: string } };
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      localStorage.removeItem(PENDING_SUMMARY_KEY);
      return;
    }

    if (!pending.messages?.length) {
      localStorage.removeItem(PENDING_SUMMARY_KEY);
      return;
    }

    (async () => {
      try {
        const memory = loadMemory();
        const { summary, evolutions } = await summarizeSession(
          pending.messages!,
          memory.preferences,
          pending.menuData ? { restaurantType: pending.menuData.restaurantType } : undefined,
        );

        summary.id = pending.sessionId ?? '';
        summary.date = new Date(pending.startTime ?? Date.now()).toISOString().slice(0, 10);

        let updated = addSession(memory, summary);
        if (evolutions.length > 0) {
          updated = applyEvolutions(updated, evolutions);
        }
        updated.lastUpdated = Date.now();
        saveMemory(updated);

        localStorage.removeItem(PENDING_SUMMARY_KEY);
      } catch (err) {
        console.error('[SAGE] Lazy summarize failed:', err);
      }
    })();
  }, []);
}
