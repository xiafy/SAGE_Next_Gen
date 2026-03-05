import { WORKER_BASE } from './config';
import type { SessionSummary, UserPreferences, PreferenceEvolution } from '../../../shared/types';

export async function summarizeSession(
  messages: { role: string; content: string }[],
  preferences: UserPreferences,
  menuData?: { restaurantType?: string },
): Promise<{ summary: SessionSummary; evolutions: PreferenceEvolution[] }> {
  const res = await fetch(`${WORKER_BASE}/api/memory/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, preferences, menuData }),
  });
  if (!res.ok) throw new Error(`Summarize failed: ${res.status}`);
  return res.json();
}
