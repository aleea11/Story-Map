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

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
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