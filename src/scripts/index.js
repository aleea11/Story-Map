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
// SERVICE WORKER REGISTRATION (FIXED)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✅ New Service Worker installed, refresh to update');
            
            // Show update notification
            if (window.Swal) {
              Swal.fire({
                title: 'Update Tersedia',
                text: 'Aplikasi telah diperbarui. Refresh halaman untuk mendapatkan versi terbaru.',
                icon: 'info',
                confirmButtonText: 'Refresh Sekarang',
                showCancelButton: true,
                cancelButtonText: 'Nanti'
              }).then((result) => {
                if (result.isConfirmed) {
                  window.location.reload();
                }
              });
            }
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
} else {
  console.warn('⚠️ Service Worker not supported in this browser');
}

// ============================================
// PWA INSTALL PROMPT (FIXED)
// ============================================

let deferredPrompt = null;
let installButton = null;

// Create install button
function createInstallButton() {
  // Check if button already exists
  if (document.getElementById('install-btn')) {
    return;
  }
  
  installButton = document.createElement('button');
  installButton.id = 'install-btn';
  installButton.className = 'btn install-btn';
  installButton.textContent = '📱 Install App';
  installButton.setAttribute('aria-label', 'Install aplikasi ke perangkat');
  
  // Style inline untuk memastikan terlihat
  installButton.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 999;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  `;
  
  installButton.addEventListener('click', handleInstallClick);
  
  document.body.appendChild(installButton);
  
  // Animate in
  setTimeout(() => {
    installButton.style.opacity = '1';
    installButton.style.transform = 'translateY(0)';
  }, 100);
  
  console.log('✅ Install button created and added to DOM');
}

// Handle install button click
async function handleInstallClick() {
  console.log('🖱️ Install button clicked');
  
  if (!deferredPrompt) {
    console.warn('⚠️ No deferred prompt available');
    
    // Show info to user
    if (window.Swal) {
      Swal.fire({
        icon: 'info',
        title: 'Sudah Terinstall',
        text: 'Aplikasi mungkin sudah terinstall atau browser tidak mendukung instalasi PWA.',
        confirmButtonText: 'OK'
      });
    }
    return;
  }
  
  // Show install prompt
  deferredPrompt.prompt();
  
  // Wait for user response
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('✅ User accepted installation');
    
    if (window.Swal) {
      Swal.fire({
        icon: 'success',
        title: 'Aplikasi Terinstall!',
        text: 'Aplikasi berhasil ditambahkan ke home screen.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  } else {
    console.log('❌ User dismissed installation');
  }
  
  // Clear deferred prompt
  deferredPrompt = null;
  hideInstallButton();
}

// Hide install button
function hideInstallButton() {
  if (installButton) {
    installButton.style.opacity = '0';
    installButton.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (installButton && installButton.parentNode) {
        installButton.parentNode.removeChild(installButton);
      }
      installButton = null;
    }, 300);
  }
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 beforeinstallprompt event fired');
  
  // Prevent default mini-infobar
  e.preventDefault();
  
  // Store event for later use
  deferredPrompt = e;
  
  // Show install button
  createInstallButton();
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('✅ App installed successfully');
  
  // Clear deferred prompt
  deferredPrompt = null;
  
  // Hide install button
  hideInstallButton();
  
  // Show success message
  if (window.Swal) {
    Swal.fire({
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
  
  // Hide install button if already installed
  const existingButton = document.getElementById('install-btn');
  if (existingButton) {
    existingButton.style.display = 'none';
  }
}

// Check if already installed (for browsers that don't fire appinstalled)
if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✅ App is already installed');
  // Don't show install button
} else {
  console.log('ℹ️ App not installed yet, waiting for beforeinstallprompt...');
}

// ============================================
// NETWORK STATUS MONITORING
// ============================================

window.addEventListener('online', () => {
  console.log('🌐 Back online');
  
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Kembali Online',
      text: 'Koneksi internet tersambung kembali.',
      timer: 2000,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }
  
  // Trigger background sync
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
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
    Swal.fire({
      icon: 'warning',
      title: 'Sedang Offline',
      text: 'Beberapa fitur mungkin tidak tersedia. Data akan dimuat dari cache.',
      timer: 2000,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }
});

// Log initial network status
console.log(`Network status: ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}`);