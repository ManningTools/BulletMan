import { useState, useEffect } from 'react';
import { adapterWrite, onStorageError } from './storageAdapter';

export function storageSet(key, value) {
  // adapterWrite handles both backends and reports failures via the error emitter
  // (synchronous quota errors in local mode, async write failures in file mode).
  adapterWrite(key, value);
}

export function useStorageError() {
  const [error, setError] = useState(null);

  useEffect(() => onStorageError(setError), []);

  const clear = () => setError(null);
  return [error, clear];
}
