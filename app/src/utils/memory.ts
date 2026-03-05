import type { SAGE_Memory, PreferenceEvolution, SessionSummary } from '../../../shared/types';

export const MEMORY_KEY = 'sage_memory_v1';
export const OLD_PREFS_KEY = 'sage_preferences_v1';
export const SESSION_KEY = 'sage_current_session';
export const PENDING_SUMMARY_KEY = 'sage_pending_summary';

const MAX_SESSIONS = 20;

function createDefaultMemory(): SAGE_Memory {
  return {
    version: 1,
    preferences: {
      restrictions: [],
      allergies: [],
      flavors: [],
      spicyLevel: 'medium',
      language: 'en',
      learned: [],
      history: [],
    },
    sessions: [],
    lastUpdated: Date.now(),
  };
}

export function migrateOldPreferences(): SAGE_Memory | null {
  try {
    const raw = localStorage.getItem(OLD_PREFS_KEY);
    if (!raw) return null;

    const old = JSON.parse(raw);
    const memory = createDefaultMemory();

    if (old?.language === 'zh' || old?.language === 'en') {
      memory.preferences.language = old.language;
    }
    if (Array.isArray(old?.dietary)) {
      memory.preferences.restrictions = old.dietary.map((value: string) => ({
        type: 'dislike' as const,
        value,
      }));
    }
    if (Array.isArray(old?.flavors)) {
      memory.preferences.flavors = old.flavors.map((value: string) => ({
        type: 'like' as const,
        value,
        strength: 2 as const,
      }));
    }

    memory.lastUpdated = Date.now();

    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    localStorage.removeItem(OLD_PREFS_KEY);

    return memory;
  } catch {
    return null;
  }
}

export function loadMemory(): SAGE_Memory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) return parsed as SAGE_Memory;
    }
  } catch {
    // fall through
  }

  const migrated = migrateOldPreferences();
  if (migrated) return migrated;

  return createDefaultMemory();
}

export function saveMemory(memory: SAGE_Memory): void {
  try {
    memory.lastUpdated = Date.now();
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // ignore storage errors
  }
}

export function addSession(memory: SAGE_Memory, session: SessionSummary): SAGE_Memory {
  const sessions = [...memory.sessions, session];
  if (sessions.length > MAX_SESSIONS) {
    sessions.splice(0, sessions.length - MAX_SESSIONS);
  }
  return { ...memory, sessions, lastUpdated: Date.now() };
}

export function applyEvolutions(memory: SAGE_Memory, evolutions: PreferenceEvolution[]): SAGE_Memory {
  const learned = [...memory.preferences.learned];

  for (const evo of evolutions) {
    const idx = learned.findIndex((e) => e.value === evo.key);

    switch (evo.action) {
      case 'add': {
        if (idx === -1 && evo.entry) {
          learned.push({ ...evo.entry });
        }
        break;
      }
      case 'strengthen': {
        if (idx !== -1) {
          const entry = { ...learned[idx]! };
          entry.confidence = Math.min(1, evo.newConfidence ?? entry.confidence + 0.2);
          entry.occurrences += 1;
          entry.lastSeen = new Date().toISOString();
          learned[idx] = entry;
        }
        break;
      }
      case 'modify': {
        if (idx !== -1 && evo.newValue !== undefined) {
          const entry = { ...learned[idx]! };
          entry.value = evo.newValue;
          entry.confidence = 1.0;
          entry.lastSeen = new Date().toISOString();
          learned[idx] = entry;
        }
        break;
      }
      case 'weaken': {
        if (idx !== -1) {
          const entry = { ...learned[idx]! };
          entry.confidence = Math.max(0, evo.newConfidence ?? entry.confidence - 0.2);
          entry.lastSeen = new Date().toISOString();
          learned[idx] = entry;
        }
        break;
      }
    }
  }

  return {
    ...memory,
    preferences: { ...memory.preferences, learned },
    lastUpdated: Date.now(),
  };
}
