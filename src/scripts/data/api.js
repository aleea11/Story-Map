import CONFIG from '../config.js';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_GUEST: `${CONFIG.BASE_URL}/stories/guest`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
  NOTIFICATION_SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
};

class ApiService {
  static async _fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  }

static async subscribeNotification({ endpoint, keys }) {
  const response = await this._fetchWithAuth(ENDPOINTS.NOTIFICATION_SUBSCRIBE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, keys }),
  });
  return response.json();
}

static async unsubscribeNotification(endpoint) {
  const response = await this._fetchWithAuth(ENDPOINTS.NOTIFICATION_SUBSCRIBE, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  return response.json();
}

  static async register({ name, email, password }) {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return response.json();
  }

  static async login({ email, password }) {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.loginResult) {
      localStorage.setItem('token', data.loginResult.token);
      localStorage.setItem('user', JSON.stringify(data.loginResult));
    }
    return data;
  }

  static async getStories({ page = 1, size = 10, location = 0 } = {}) {
    const params = new URLSearchParams({ page, size, location });
    const response = await this._fetchWithAuth(`${ENDPOINTS.STORIES}?${params}`);
    return response.json();
  }

  static async getStoryDetail(id) {
    const response = await this._fetchWithAuth(ENDPOINTS.STORY_DETAIL(id));
    return response.json();
  }

  static async addStory({ description, photo, lat, lon }) {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    if (lat !== undefined && lon !== undefined) {
      formData.append('lat', lat);
      formData.append('lon', lon);
    }
    
    const response = await this._fetchWithAuth(ENDPOINTS.STORIES, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }

  static async addStoryGuest({ description, photo, lat, lon }) {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    if (lat !== undefined && lon !== undefined) {
      formData.append('lat', lat);
      formData.append('lon', lon);
    }
    
    const response = await fetch(ENDPOINTS.STORIES_GUEST, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }

  static async subscribeNotification({ endpoint, keys }) {
    const response = await this._fetchWithAuth(ENDPOINTS.NOTIFICATION_SUBSCRIBE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, keys }),
    });
    return response.json();
  }

  static async unsubscribeNotification(endpoint) {
    const response = await this._fetchWithAuth(ENDPOINTS.NOTIFICATION_SUBSCRIBE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    return response.json();
  }
}

export default ApiService;