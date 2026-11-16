/**
 * Persistence layer.
 *
 * Default (zero-config, no accounts): browser IndexedDB + localStorage.
 * This lets the application work immediately without any cloud setup.
 *
 * A cloud adapter can be swapped in later (D1, Supabase, Netlify Blob, etc.)
 * behind the same StoragePort interface. Browser storage is used by default
 * so the app never depends on a permanently running PC or a paid database.
 */
import type { Theme } from '@/types';

const DB_NAME = 'PhotoStudioAI';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_CONVERSATIONS = 'conversations';
const STORE_IMAGES = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export const storage = {
  async listProjects() {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    return new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      req.onerror = () => reject(req.error);
    });
  },
  async getProject(id: string) {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    return new Promise<any>((resolve, reject) => {
      const req = tx.objectStore(STORE_PROJECTS).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async saveProject(project: any) {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const item = { ...project, updatedAt: new Date().toISOString() };
    store.put(item);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async deleteProject(id: string) {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(id);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async saveImage(id: string, dataUrl: string) {
    const db = await openDB();
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).put({ id, dataUrl, savedAt: new Date().toISOString() });
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async getImage(id: string) {
    const db = await openDB();
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    return new Promise<string | null>((resolve, reject) => {
      const req = tx.objectStore(STORE_IMAGES).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => reject(req.error);
    });
  },
};

export const themeStorage = {
  get(): Theme {
    if (typeof localStorage === 'undefined') return 'light';
    const v = localStorage.getItem('ps:theme');
    return (v === 'light' || v === 'dark') ? v : 'light';
  },
  set(v: Theme) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('ps:theme', v);
  },
};
