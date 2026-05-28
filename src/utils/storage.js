import { useState, useEffect } from 'react';

const errorListeners = new Set();

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // QuotaExceededError or similar — notify all mounted listeners
    errorListeners.forEach(fn =>
      fn('Storage is full. Export a backup and use Prune to free space.')
    );
  }
}

export function useStorageError() {
  const [error, setError] = useState(null);

  useEffect(() => {
    errorListeners.add(setError);
    return () => { errorListeners.delete(setError); };
  }, []);

  const clear = () => setError(null);
  return [error, clear];
}
