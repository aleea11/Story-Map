// CSS imports
import '../styles/styles.css';

import App from './pages/app';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });
});

// Handle authentication UI
  const token = localStorage.getItem('token');
  const authLinks = document.getElementById('auth-links');
  const logoutLink = document.getElementById('logout-link');
  const logoutBtn = document.getElementById('logout-btn');
  if (token) {
    authLinks.style.display = 'none';
    logoutLink.style.display = 'block';
  } else {
    authLinks.style.display = 'block';
    logoutLink.style.display = 'none';
  }
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#/';
    location.reload();
  });

// ... existing code ...

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered successfully:', registration);
        
        // Request notification permission
        if ('Notification' in window) {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              console.log('Notification permission granted');
            } else {
              console.log('Notification permission denied or dismissed');
            }
          }).catch((error) => {
            console.error('Error requesting notification permission:', error);
          });
        }

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('Message from SW:', event.data);
        });
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  });
}

// ... existing code ...

// PWA Install Prompt
let deferredPrompt = null;

function showInstallButton() {
  if (document.getElementById('install-btn')) return; // prevent duplicate button
  
  const installBtn = document.createElement('button');
  installBtn.id = 'install-btn';
  installBtn.className = 'btn install-btn';
  installBtn.textContent = 'Install App';

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
      hideInstallButton();
    }
  });

  document.body.appendChild(installBtn);
}

function hideInstallButton() {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.remove();
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  console.log('beforeinstallprompt fired');
  deferredPrompt = e;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  console.log('App installed!');
  deferredPrompt = null;
  hideInstallButton();
});

// ==========================
// Push Notification Handler
// ==========================
const notifyBtn = document.getElementById('push-toggle');

if (notifyBtn) {
  notifyBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      Swal.fire('Browser tidak mendukung notifikasi');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.showNotification("Notifikasi Aktif ✅", {
          body: "Push Notification berhasil diaktifkan!",
          icon: "/icons/icon-192x192.png",
          vibrate: [200, 100, 200],
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Notifikasi Diaktifkan ✅',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Izin Notifikasi Ditolak ❌',
        text: 'Anda dapat mengaktifkannya di pengaturan browser.'
      });
    }
  });

  // ✅ Push Notification Toggle
function initPushToggle() {
  const toggle = document.getElementById('push-toggle');
  if (!toggle) return;

  // Restore state
  const isSubscribed = localStorage.getItem('push-subscribed') === 'true';
  toggle.checked = isSubscribed;

  toggle.addEventListener('change', async (e) => {
    if (e.target.checked) {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        Swal.fire('Izin Notifikasi Ditolak ❌');
        toggle.checked = false;
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.showNotification("Push Notification Aktif ✅", {
          body: "Anda akan mendapatkan notifikasi cerita baru!",
          icon: "/icons/icon-192x192.png"
        });
      }

      localStorage.setItem('push-subscribed', 'true');
      Swal.fire('Notifikasi Diaktifkan ✅');

    } else {
      localStorage.setItem('push-subscribed', 'false');
      Swal.fire('Notifikasi Dinonaktifkan ⚠️');
    }
  });
}

window.addEventListener('DOMContentLoaded', initPushToggle);
window.addEventListener('hashchange', initPushToggle);

}
