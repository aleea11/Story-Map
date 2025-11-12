import ApiService from '../data/api.js';

class PushNotificationManager {
  constructor() {
    this.vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
  }

  async initToggle(toggleElement) {
    // Check current subscription status on load
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        toggleElement.checked = !!subscription;
        console.log('Current subscription status:', !!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
        toggleElement.checked = false;
      }
    } else {
      console.log('Push notifications not supported');
      toggleElement.disabled = true;
      toggleElement.parentElement.innerHTML += '<small style="color: #666; margin-left: 1rem;">(Tidak didukung di browser ini)</small>';
    }

    toggleElement.addEventListener('change', async (event) => {
      const isChecked = event.target.checked;
      console.log('Toggle changed:', isChecked);
      
      try {
        if (isChecked) {
          await this.subscribe();
        } else {
          await this.unsubscribe();
        }
      } catch (error) {
        console.error('Error in toggle handler:', error);
        // Reset toggle state on error
        event.target.checked = !isChecked;
        await this._showError('Terjadi kesalahan saat mengubah pengaturan notifikasi.');
      }
    });
  }

  async subscribe() {
    console.log('Starting subscription process...');
    
    try {
      // Check if service worker is ready
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker tidak didukung');
      }
      
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready');
      
      // Check notification permission
      if (Notification.permission === 'denied') {
        throw new Error('Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.');
      }
      
      // Request permission if not granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Izin notifikasi diperlukan untuk fitur ini.');
        }
      }
      
      console.log('Subscribing to push...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(this.vapidPublicKey)
      });
      
      console.log('Subscription created:', subscription);
      
      // Extract keys
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Gagal mendapatkan kunci subscription');
      }
      
      // Send to server
      const result = await ApiService.subscribeNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this._arrayBufferToBase64(p256dhKey),
          auth: this._arrayBufferToBase64(authKey)
        }
      });
      
      if (result.error) {
        throw new Error(result.message || 'Gagal subscribe ke server');
      }
      
      console.log('Successfully subscribed');
      await this._showSuccess('Push Notification Diaktifkan', 'Anda akan menerima notifikasi ketika ada cerita baru.');
      
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  }

  async unsubscribe() {
    console.log('Starting unsubscription process...');
    
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker tidak didukung');
      }
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('No active subscription found');
        return;
      }
      
      console.log('Unsubscribing...');
      
      // Unsubscribe from server first
      const result = await ApiService.unsubscribeNotification(subscription.endpoint);
      
      if (result.error) {
        console.warn('Server unsubscribe failed, but continuing with local unsubscribe');
      }
      
      // Unsubscribe locally
      const success = await subscription.unsubscribe();
      
      if (!success) {
        throw new Error('Gagal unsubscribe dari browser');
      }
      
      console.log('Successfully unsubscribed');
      await this._showInfo('Push Notification Dinonaktifkan', 'Anda tidak akan menerima notifikasi lagi.');
      
    } catch (error) {
      console.error('Unsubscription failed:', error);
      throw error;
    }
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async _showSuccess(title, text) {
    if (window.Swal) {
      await window.Swal.fire({
        icon: 'success',
        title,
        text,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      alert(`${title}: ${text}`);
    }
  }

  async _showInfo(title, text) {
    if (window.Swal) {
      await window.Swal.fire({
        icon: 'info',
        title,
        text,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      alert(`${title}: ${text}`);
    }
  }

  async _showError(text) {
    if (window.Swal) {
      await window.Swal.fire({
        icon: 'error',
        title: 'Error',
        text
      });
    } else {
      alert(`Error: ${text}`);
    }
  }
}

export default PushNotificationManager;