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

  updateAuthUI();
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

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
      
      console.log('✅ SW registered:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 SW update found');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✅ New SW installed');
            
            if (window.Swal) {
              Swal.fire({
                title: 'Update Tersedia',
                text: 'Refresh untuk update',
                icon: 'info',
                confirmButtonText: 'Refresh',
                showCancelButton: true
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
      console.error('❌ SW registration failed:', error);
    }
  });
} else {
  console.warn('⚠️ Service Worker not supported');
}

// ============================================
// PWA INSTALL PROMPT (FIXED)
// ============================================

let deferredPrompt = null;
let installButton = null;

function createInstallButton() {
  if (document.getElementById('install-btn')) return;
  
  installButton = document.createElement('button');
  installButton.id = 'install-btn';
  installButton.className = 'btn install-btn';
  installButton.textContent = '📱 Install App';
  
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
    transition: all 0.3s ease;
  `;
  
  installButton.addEventListener('click', handleInstallClick);
  document.body.appendChild(installButton);
  
  setTimeout(() => {
    installButton.style.opacity = '1';
    installButton.style.transform = 'translateY(0)';
  }, 100);
  
  console.log('✅ Install button created');
}

async function handleInstallClick() {
  console.log('🖱️ Install clicked');
  
  if (!deferredPrompt) {
    console.warn('⚠️ No deferred prompt');
    
    if (window.Swal) {
      Swal.fire({
        icon: 'info',
        title: 'Sudah Terinstall',
        text: 'Aplikasi mungkin sudah terinstall',
        confirmButtonText: 'OK'
      });
    }
    return;
  }
  
  deferredPrompt.prompt();
  
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('✅ Install accepted');
    
    if (window.Swal) {
      Swal.fire({
        icon: 'success',
        title: 'Aplikasi Terinstall!',
        text: 'Aplikasi ditambahkan ke home screen',
        timer: 2000,
        showConfirmButton: false
      });
    }
  }
  
  deferredPrompt = null;
  hideInstallButton();
}

function hideInstallButton() {
  if (installButton) {
    installButton.style.opacity = '0';
    setTimeout(() => {
      if (installButton && installButton.parentNode) {
        installButton.parentNode.removeChild(installButton);
      }
      installButton = null;
    }, 300);
  }
}

// Listen for beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  createInstallButton();
});

// Listen for appinstalled
window.addEventListener('appinstalled', () => {
  console.log('✅ App installed');
  deferredPrompt = null;
  hideInstallButton();
  
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Terima Kasih!',
      text: 'Aplikasi berhasil diinstall',
      timer: 2000,
      showConfirmButton: false
    });
  }
});

// Check if already in standalone
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('🚀 Running in standalone mode');
  const existingBtn = document.getElementById('install-btn');
  if (existingBtn) {
    existingBtn.style.display = 'none';
  }
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
      text: 'Koneksi internet tersambung',
      timer: 2000,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }
});

window.addEventListener('offline', () => {
  console.log('📴 Gone offline');
  
  if (window.Swal) {
    Swal.fire({
      icon: 'warning',
      title: 'Sedang Offline',
      text: 'Data dimuat dari cache',
      timer: 2000,
      showConfirmButton: false,
      position: 'bottom-end',
      toast: true
    });
  }
});

console.log(`Network status: ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}`);