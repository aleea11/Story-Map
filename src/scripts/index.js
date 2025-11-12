// CSS imports
import '../styles/styles.css';

import App from './pages/app';

// Initialize app
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

  // Handle authentication UI
  updateAuthUI();
  
  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

// Update auth UI based on login status
function updateAuthUI() {
  const token = localStorage.getItem('token');
  const authLinks = document.getElementById('auth-links');
  const logoutLink = document.getElementById('logout-link');
  
  if (token) {
    if (authLinks) authLinks.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'block';
  } else {
    if (authLinks) authLinks.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
  }
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.hash = '#/';
  location.reload();
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ New Service Worker available');
            // Optionally show update notification
            showUpdateNotification();
          }
        });
      });
      
      // Request notification permission after SW is ready
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          requestNotificationPermission();
        }, 3000); // Wait 3 seconds before asking
      }
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

// Handle messages from service worker
function handleSWMessage(event) {
  console.log('📨 Message from Service Worker:', event.data);
  
  const { type, count } = event.data;
  
  if (type === 'SYNC_COMPLETE') {
    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'Sync Selesai',
        text: `${count} cerita berhasil disinkronisasi`,
        timer: 2000,
        showConfirmButton: false
      });
    }
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Browser tidak mendukung notifikasi');
    return;
  }
  
  const permission = Notification.permission;
  
  if (permission === 'default') {
    if (window.Swal) {
      const result = await window.Swal.fire({
        title: 'Aktifkan Notifikasi?',
        text: 'Dapatkan pemberitahuan ketika ada cerita baru!',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Aktifkan',
        cancelButtonText: 'Nanti Saja'
      });
      
      if (result.isConfirmed) {
        const newPermission = await Notification.requestPermission();
        if (newPermission === 'granted') {
          window.Swal.fire({
            icon: 'success',
            title: 'Notifikasi Diaktifkan!',
            text: 'Anda akan mendapat pemberitahuan cerita baru.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    }
  }
}

// Show update notification
function showUpdateNotification() {
  if (window.Swal) {
    window.Swal.fire({
      title: 'Update Tersedia',
      text: 'Versi baru aplikasi tersedia. Muat ulang untuk update?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Muat Ulang',
      cancelButtonText: 'Nanti'
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });
  }
}

// ============================================
// PWA INSTALL PROMPT
// ============================================

let deferredPrompt = null;

// Show install button
function showInstallButton() {
  // Check if button already exists
  if (document.getElementById('install-btn')) {
    return;
  }
  
  const installBtn = document.createElement('button');
  installBtn.id = 'install-btn';
  installBtn.className = 'btn install-btn';
  installBtn.textContent = '📱 Install App';
  installBtn.setAttribute('aria-label', 'Install aplikasi ke perangkat');
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      return;
    }
    
    // Show install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('User accepted installation');
      if (window.Swal) {
        window.Swal.fire({
          icon: 'success',
          title: 'Aplikasi Terinstall!',
          text: 'Aplikasi berhasil ditambahkan ke home screen.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
    
    // Clear deferred prompt
    deferredPrompt = null;
    hideInstallButton();
  });
  
  // Add to page
  document.body.appendChild(installBtn);
  
  // Animate in
  setTimeout(() => {
    installBtn.style.opacity = '1';
    installBtn.style.transform = 'translateY(0)';
  }, 100);
}

// Hide install button
function hideInstallButton() {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.style.opacity = '0';
    installBtn.style.transform = 'translateY(20px)';
    setTimeout(() => {
      installBtn.remove();
    }, 300);
  }
}

// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent default mini-infobar
  e.preventDefault();
  
  console.log('📱 beforeinstallprompt fired');
  
  // Store event for later use
  deferredPrompt = e;
  
  // Show install button
  showInstallButton();
});

// Listen for app installed
window.addEventListener('appinstalled', () => {
  console.log('✅ App installed successfully');
  
  // Clear deferred prompt
  deferredPrompt = null;
  
  // Hide install button
  hideInstallButton();
  
  // Show success message
  if (window.Swal) {
    window.Swal.fire({
      icon: 'success',
      title: 'Terima Kasih!',
      text: 'Aplikasi berhasil diinstall di perangkat Anda.',
      timer: 2000,
      showConfirmButton: false
    });
  }
  
  // Track installation (optional analytics)
  console.log('PWA installation completed');
});

// Detect if app is running in standalone mode
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('🚀 App running in standalone mode');
}

// ============================================
// NETWORK STATUS MONITORING
// ============================================

window.addEventListener('online', () => {
  console.log('🌐 Back online');
  
  if (window.Swal) {
    window.Swal.fire({
      icon: 'success',
      title: 'Kembali Online',
      text: 'Koneksi internet tersambung kembali.',
      timer: 2000,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }
  
  // Trigger sync
  if ('serviceWorker' in navigator && 'sync' in registration) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register('sync-stories');
    }).catch((error) => {
      console.error('Background sync registration failed:', error);
    });
  }
});

window.addEventListener('offline', () => {
  console.log('📴 Gone offline');
  
  if (window.Swal) {
    window.Swal.fire({
      icon: 'warning',
      title: 'Sedang Offline',
      text: 'Beberapa fitur mungkin tidak tersedia.',
      timer: 2000,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }
});

// Log initial network status
console.log(`Network status: ${navigator.onLine ? 'Online' : 'Offline'}`);