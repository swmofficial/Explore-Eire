import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMapStore } from '../store/mapStore';

const QUEUE_KEY = 'ee_offline_queue';
const MAX_RETRIES = 3;

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(() => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const processingRef = useRef(false);
  const addToast = useMapStore((s) => s.addToast);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }
  }, [queue]);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !isOnline || queue.length === 0) return;
    processingRef.current = true;

    const pending = [...queue];
    const failed = [];

    for (const item of pending) {
      try {
        const { table, operation, data, id } = item;
        let result;
        if (operation === 'insert') {
          result = await supabase.from(table).insert(data).select().single();
        } else if (operation === 'update') {
          result = await supabase.from(table).update(data).eq('id', id).select().single();
        } else if (operation === 'delete') {
          result = await supabase.from(table).delete().eq('id', id);
        }
        if (result?.error) throw result.error;
      } catch (e) {
        console.error('Offline queue retry failed:', e);
        if ((item.retries || 0) < MAX_RETRIES) {
          failed.push({ ...item, retries: (item.retries || 0) + 1 });
        } else {
          addToast({ message: `Failed to sync ${item.table} after ${MAX_RETRIES} attempts`, type: 'error', duration: 5000 });
        }
      }
    }

    setQueue(failed);
    if (pending.length > failed.length) {
      addToast({ message: `Synced ${pending.length - failed.length} pending changes`, type: 'success', duration: 3000 });
    }
    processingRef.current = false;
  }, [isOnline, queue, addToast]);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  const queueWrite = useCallback(async (table, operation, data, id = null) => {
    if (!isOnline) {
      const queueItem = { table, operation, data, id, timestamp: Date.now(), retries: 0 };
      setQueue((prev) => [...prev, queueItem]);
      addToast({ message: 'Saved offline - will sync when connected', type: 'warning', duration: 4000 });
      return { data: { ...data, _offline: true, _tempId: `temp_${Date.now()}` }, error: null, offline: true };
    }

    try {
      let result;
      if (operation === 'insert') {
        result = await supabase.from(table).insert(data).select().single();
      } else if (operation === 'update') {
        result = await supabase.from(table).update(data).eq('id', id).select().single();
      } else if (operation === 'delete') {
        result = await supabase.from(table).delete().eq('id', id);
      }
      if (result?.error) throw result.error;
      return { data: result.data, error: null, offline: false };
    } catch (e) {
      console.error(`Online write to ${table} failed, queueing:`, e);
      const queueItem = { table, operation, data, id, timestamp: Date.now(), retries: 0 };
      setQueue((prev) => [...prev, queueItem]);
      addToast({ message: 'Connection issue - saved offline', type: 'warning', duration: 4000 });
      return { data: { ...data, _offline: true, _tempId: `temp_${Date.now()}` }, error: null, offline: true };
    }
  }, [isOnline, addToast]);

  const getPendingCount = useCallback(() => queue.length, [queue]);

  return { queueWrite, isOnline, pendingCount: queue.length, getPendingCount, processQueue };
}