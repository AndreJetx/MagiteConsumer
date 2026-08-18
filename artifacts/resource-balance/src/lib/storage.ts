const STORAGE_PREFIX = 'resource-balance-state-v2';
const LEGACY_STORAGE_KEYS = ['resource-balance-state-v2', 'resource-balance-state-v1'];

let cachedStorage: Storage | null | undefined;

function readStorage(): Storage | null {
  if (cachedStorage !== undefined) return cachedStorage;
  try {
    const storage = window.localStorage;
    const probe = '__resource_balance_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    cachedStorage = storage;
    return storage;
  } catch {
    cachedStorage = null;
    return null;
  }
}

function keyFor(userId?: string): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

export function readCachedState(userId?: string): string | null {
  const storage = readStorage();
  if (!storage) return null;
  try {
    const current = storage.getItem(keyFor(userId));
    if (current) return current;
    if (!userId) {
      for (const key of LEGACY_STORAGE_KEYS) {
        const legacy = storage.getItem(key);
        if (legacy) return legacy;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeCachedState(value: string, userId?: string): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(keyFor(userId), value);
  } catch {
    // Preview iframes and locked-down browsers can deny storage.
  }
}
