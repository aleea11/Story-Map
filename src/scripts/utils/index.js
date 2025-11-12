export function showFormattedDate(date, locale = 'en-US', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// ... existing code ...

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        console.log('User choice:', choiceResult.outcome);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    });
  }
});

window.addEventListener('appinstalled', (evt) => {
  console.log('App was installed');
  deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
});

// ... existing code ...