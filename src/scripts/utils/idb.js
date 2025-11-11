const DB_NAME = 'StoryAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'stories';

class IndexedDBHelper {
  static openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  static async addStory(story) {
  const db = await this.openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  // Generate unique ID if not provided
  if (!story.id) {
    story.id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  story.createdAt = story.createdAt || new Date().toISOString();
  story.synced = story.synced !== undefined ? story.synced : false;
  
  return new Promise((resolve, reject) => {
    const request = store.add(story);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('Error adding to IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

  static async getAllStories() {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async clearAllStories() {
  const db = await this.openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => {
      console.log('All stories cleared from IndexedDB');
      resolve(request.result);
    };
    request.onerror = () => {
      console.error('Error clearing stories:', request.error);
      reject(request.error);
    };
  });
}

  static async deleteStory(id) {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async updateStory(story) {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(story);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async getUnsyncedStories() {
    const allStories = await this.getAllStories();
    return allStories.filter(story => !story.synced);
  }

  static async markAsSynced(id) {
    const story = await this.getStory(id);
    if (story) {
      story.synced = true;
      await this.updateStory(story);
    }
  }

  static async getStory(id) {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export default IndexedDBHelper;