import { collection, query, where, getDocs, getDocsFromCache, getDocsFromServer, doc, getDoc, getDocFromCache, getDocFromServer, Query, DocumentReference } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface CacheResult<T> {
  data: T | null;
  fromCache: boolean;
}

/**
 * A centralized data repository for performing stale-while-revalidate fetches.
 * Ensures fast initial load from cache, followed by a background sync.
 */
export class DataRepository {
  /**
   * Fetch a single document with stale-while-revalidate strategy.
   */
  static async getDocument<T>(
    docRef: DocumentReference,
    onData: (result: CacheResult<T>) => void,
    mapData: (id: string, data: any) => T
  ): Promise<void> {
    try {
      // 1. Try Cache First
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        onData({ data: mapData(cacheSnap.id, cacheSnap.data()), fromCache: true });
      } else {
        onData({ data: null, fromCache: true });
      }
    } catch (e) {
      // Cache miss or error (expected on first load)
    }

    try {
      // 2. Fetch from Server (Silent Sync)
      const serverSnap = await getDocFromServer(docRef);
      if (serverSnap.exists()) {
        onData({ data: mapData(serverSnap.id, serverSnap.data()), fromCache: false });
      } else {
        onData({ data: null, fromCache: false });
      }
    } catch (e) {
      console.warn('Silent sync failed:', e);
    }
  }

  /**
   * Fetch a collection/query with stale-while-revalidate strategy.
   */
  static async getCollection<T>(
    q: Query,
    onData: (result: CacheResult<T[]>) => void,
    mapData: (id: string, data: any) => T
  ): Promise<void> {
    try {
      // 1. Try Cache First
      const cacheSnap = await getDocsFromCache(q);
      if (!cacheSnap.empty) {
        const cacheData = cacheSnap.docs.map(doc => mapData(doc.id, doc.data()));
        onData({ data: cacheData, fromCache: true });
      }
    } catch (e) {
      // Cache miss or error
    }

    try {
      // 2. Fetch from Server (Silent Sync)
      const serverSnap = await getDocsFromServer(q);
      const serverData = serverSnap.docs.map(doc => mapData(doc.id, doc.data()));
      onData({ data: serverData, fromCache: false });
    } catch (e) {
      console.warn('Silent sync failed:', e);
    }
  }
}
