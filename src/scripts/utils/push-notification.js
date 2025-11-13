import ApiService from '../data/api.js';

// VAPID Public Key dari API Dicoding Story
const VAPID_PUBLIC_KEY = 'BN7-r0Svv7CsTi18-OPYtJLVW0bfuZ1x1UhyhHsQCIqKu543pM8sK5EPTYaFmNt3S-7dVbPVGK34jF6LVXzH9Xo';

class PushNotificationManager {
  constructor() {
    this.isEnabled = false;
    this.subscription = null;
  }

  /**
   * Inisialisasi toggle untuk push notification
   */
  async initToggle(toggleElement) {
    // Cek status permission & subscription
    const permission = Notification.permission;
    const subscription = await this._getSubscription();
    
    this.isEnabled = (permission === 'granted' && subscription !== null);
    toggleElement.checked = this.isEnabled;

    toggleElement.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await this._enableNotifications();
        toggleElement.checked = this.isEnabled;
      } else {
        await this._disableNotifications();
        toggleElement.checked = this.isEnabled;
      }
    });
  }

  /**
   * Aktifkan push notifications
   */
  async _enableNotifications() {
    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        await Swal.fire({
          icon: 'warning',
          title: 'Izin Ditolak',
          text: 'Anda perlu mengizinkan notifikasi dari browser.',
        });
        this.isEnabled = false;
        return;
      }

      // 2. Register service worker jika belum
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe dengan VAPID key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      this.subscription = subscription;

      // 4. Kirim subscription ke server
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this._arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this._arrayBufferToBase64(subscription.getKey('auth'))
        }
      };

      const result = await ApiService.subscribeNotification(subscriptionData);

      if (!result.error) {
        this.isEnabled = true;
        
        await Swal.fire({
          icon: 'success',
          title: 'Notifikasi Aktif!',
          text: 'Anda akan menerima notifikasi untuk cerita baru.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error(result.message || 'Gagal subscribe');
      }

    } catch (error) {
      console.error('Error enabling notifications:', error);
      this.isEnabled = false;
      
      await Swal.fire({
        icon: 'error',
        title: 'Gagal Mengaktifkan Notifikasi',
        text: error.message || 'Terjadi kesalahan saat mengaktifkan notifikasi.'
      });
    }
  }

  /**
   * Matikan push notifications
   */
  async _disableNotifications() {
    try {
      const subscription = await this._getSubscription();
      
      if (subscription) {
        // Unsubscribe dari browser
        await subscription.unsubscribe();

        // Beritahu server
        try {
          await ApiService.unsubscribeNotification(subscription.endpoint);
        } catch (error) {
          console.warn('Failed to notify server:', error);
        }
      }

      this.isEnabled = false;
      this.subscription = null;

      await Swal.fire({
        icon: 'info',
        title: 'Notifikasi Dimatikan',
        text: 'Anda tidak akan menerima notifikasi lagi.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  }

  /**
   * Ambil subscription yang ada
   */
  async _getSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Convert VAPID key dari Base64 URL-safe ke Uint8Array
   */
  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer ke Base64
   */
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export default PushNotificationManager;