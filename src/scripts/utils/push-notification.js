// ============================================
// PUSH NOTIFICATION MANAGER
// File: src/scripts/utils/push-notification.js
// ============================================

const VAPID_PUBLIC_KEY = 'BN7-r0Svv7CsTi18-OPYtJLVW0bfuZ1x1UhyhHsQCIqKu543pM8sK5EPTYaFmNt3S-7dVbPVGK34jF6LVXzH9Xo';

class PushNotificationManager {
  constructor() {
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Initialize toggle button on homepage
   */
  initToggle(toggleElement) {
    if (!this.isSupported) {
      console.log('❌ Push notifications not supported');
      toggleElement.disabled = true;
      return;
    }

    // Check current permission state
    this._updateToggleState(toggleElement);

    // Add event listener
    toggleElement.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await this.subscribe();
      } else {
        await this.unsubscribe();
      }
      this._updateToggleState(toggleElement);
    });
  }

  /**
   * Update toggle state based on permission
   */
  async _updateToggleState(toggleElement) {
    const permission = Notification.permission;
    
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      toggleElement.checked = !!subscription;
    } else {
      toggleElement.checked = false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    try {
      console.log('🔔 Subscribing to push notifications...');

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('❌ Notification permission denied');
        await window.Swal.fire({
          icon: 'warning',
          title: 'Permission Ditolak',
          text: 'Anda menolak notifikasi. Aktifkan di pengaturan browser untuk menerima update.',
          confirmButtonText: 'OK'
        });
        return false;
      }

      console.log('✅ Notification permission granted');

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('✅ Push subscription created:', subscription.endpoint);

      this.subscription = subscription;

      // Show success message
      await window.Swal.fire({
        icon: 'success',
        title: 'Notifikasi Aktif!',
        text: 'Anda akan menerima notifikasi saat ada cerita baru.',
        timer: 2000,
        showConfirmButton: false,
        position: 'bottom-end',
        toast: true
      });

      return true;

    } catch (error) {
      console.error('❌ Error subscribing to push:', error);
      
      await window.Swal.fire({
        icon: 'error',
        title: 'Gagal Subscribe',
        text: 'Terjadi kesalahan saat mengaktifkan notifikasi.',
        confirmButtonText: 'OK'
      });
      
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      console.log('🔕 Unsubscribing from push notifications...');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log('✅ Unsubscribed from push notifications');
        
        this.subscription = null;

        await window.Swal.fire({
          icon: 'info',
          title: 'Notifikasi Dimatikan',
          text: 'Anda tidak akan menerima notifikasi lagi.',
          timer: 2000,
          showConfirmButton: false,
          position: 'bottom-end',
          toast: true
        });

        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Send push notification (for testing/demo purposes)
   * In production, this should be triggered by backend server
   */
  async sendTestNotification(title, body) {
    try {
      if (Notification.permission !== 'granted') {
        console.log('❌ No notification permission');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(title || 'Notifikasi Baru', {
        body: body || 'Ada data baru ditambahkan.',
        icon: '/icons/icon.png',
        badge: '/icons/icon.png',
        tag: 'test-notification-' + Date.now(),
        requireInteraction: false,
        data: { 
          url: '/',
          dateOfArrival: Date.now()
        },
        actions: [
          { action: 'open', title: '📖 Lihat' },
          { action: 'close', title: '❌ Tutup' }
        ]
      });

      console.log('✅ Test notification sent');
      return true;

    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return false;
    }
  }

  /**
   * Convert VAPID key from Base64 URL-safe to Uint8Array
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
}

export default PushNotificationManager;