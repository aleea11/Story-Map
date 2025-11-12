const DB_NAME = 'StoryAppDB';
const DB_VERSION = 1;
const STORIES_STORE = 'stories';
const FAVORITES_STORE = 'favorites';

class IndexedDBHelper {
  static openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('IndexedDB opened successfully');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('Upgrading IndexedDB...');
        const db = event.target.result;
        
        // Create stories store
        if (!db.objectStoreNames.contains(STORIES_STORE)) {
          const storyStore = db.createObjectStore(STORIES_STORE, { keyPath: 'id' });
          storyStore.createIndex('createdAt', 'createdAt', { unique: false });
          storyStore.createIndex('synced', 'synced', { unique: false });
          console.log('Stories store created');
        }
        
        // Create favorites store
        if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
          const favStore = db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' });
          favStore.createIndex('addedAt', 'addedAt', { unique: false });
          console.log('Favorites store created');
        }
      };
    });
  }

  // ==================== STORIES CRUD ====================
  
  static async addStory(story) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORIES_STORE], 'readwrite');
      const store = transaction.objectStore(STORIES_STORE);
      
      // Generate unique ID if not provided
      if (!story.id) {
        story.id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Set default values
      story.createdAt = story.createdAt || new Date().toISOString();
      story.synced = story.synced !== undefined ? story.synced : false;
      
      return new Promise((resolve, reject) => {
        const request = store.add(story);
        
        request.onsuccess = () => {
          console.log('Story added to IndexedDB:', story.id);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error adding story:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Add story failed:', error);
      throw error;
    }
  }

  static async getStory(id) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORIES_STORE], 'readonly');
      const store = transaction.objectStore(STORIES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Get story failed:', error);
      throw error;
    }
  }

  static async getAllStories() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORIES_STORE], 'readonly');
      const store = transaction.objectStore(STORIES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log('Retrieved stories:', request.result.length);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error getting stories:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Get all stories failed:', error);
      throw error;
    }
  }

  static async updateStory(story) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORIES_STORE], 'readwrite');
      const store = transaction.objectStore(STORIES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.put(story);
        
        request.onsuccess = () => {
          console.log('Story updated:', story.id);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error updating story:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Update story failed:', error);
      throw error;
    }
  }

  static async deleteStory(id) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORIES_STORE], 'readwrite');
      const store = transaction.objectStore(STORIES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log('Story deleted:', id);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error deleting story:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Delete story failed:', error);
      throw error;
    }
  }

  static async clearAllStories() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORIES_STORE], 'readwrite');
      const store = transaction.objectStore(STORIES_STORE);
      
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
    } catch (error) {
      console.error('Clear stories failed:', error);
      throw error;
    }
  }

  static async getUnsyncedStories() {
    try {
      const allStories = await this.getAllStories();
      return allStories.filter(story => !story.synced);
    } catch (error) {
      console.error('Get unsynced stories failed:', error);
      throw error;
    }
  }

  static async markAsSynced(id) {
    try {
      const story = await this.getStory(id);
      if (story) {
        story.synced = true;
        await this.updateStory(story);
        console.log('Story marked as synced:', id);
      }
    } catch (error) {
      console.error('Mark as synced failed:', error);
      throw error;
    }
  }

  // ==================== FAVORITES CRUD ====================
  
  static async addToFavorites(story) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([FAVORITES_STORE], 'readwrite');
      const store = transaction.objectStore(FAVORITES_STORE);
      
      const favoriteStory = {
        ...story,
        addedAt: new Date().toISOString()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.add(favoriteStory);
        
        request.onsuccess = () => {
          console.log('Added to favorites:', story.id);
          resolve(request.result);
        };
        
        request.onerror = () => {
          // Story might already be in favorites
          if (request.error.name === 'ConstraintError') {
            reject(new Error('Cerita sudah ada di favorit'));
          } else {
            reject(request.error);
          }
        };
      });
    } catch (error) {
      console.error('Add to favorites failed:', error);
      throw error;
    }
  }

  static async removeFromFavorites(id) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([FAVORITES_STORE], 'readwrite');
      const store = transaction.objectStore(FAVORITES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log('Removed from favorites:', id);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error removing from favorites:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Remove from favorites failed:', error);
      throw error;
    }
  }

  static async getAllFavorites() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([FAVORITES_STORE], 'readonly');
      const store = transaction.objectStore(FAVORITES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log('Retrieved favorites:', request.result.length);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error getting favorites:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Get all favorites failed:', error);
      throw error;
    }
  }

  static async isFavorite(id) {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([FAVORITES_STORE], 'readonly');
      const store = transaction.objectStore(FAVORITES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(!!request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Check favorite failed:', error);
      return false;
    }
  }

  static async clearAllFavorites() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([FAVORITES_STORE], 'readwrite');
      const store = transaction.objectStore(FAVORITES_STORE);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('All favorites cleared');
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Error clearing favorites:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Clear favorites failed:', error);
      throw error;
    }
  }

  // ==================== UTILITY ====================
  
  static async getDatabaseStats() {
    try {
      const stories = await this.getAllStories();
      const favorites = await this.getAllFavorites();
      const unsynced = await this.getUnsyncedStories();
      
      return {
        totalStories: stories.length,
        totalFavorites: favorites.length,
        unsyncedStories: unsynced.length,
        syncedStories: stories.length - unsynced.length
      };
    } catch (error) {
      console.error('Get database stats failed:', error);
      return {
        totalStories: 0,
        totalFavorites: 0,
        unsyncedStories: 0,
        syncedStories: 0
      };
    }
  }
}

export default IndexedDBHelper;