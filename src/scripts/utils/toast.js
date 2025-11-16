// ============================================
// SIMPLE TOAST NOTIFICATION
// File: src/scripts/utils/toast.js
// ============================================

class Toast {
  static show(title, message, duration = 5000) {
    // Buat container jika belum ada
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        min-width: 300px;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }

    // Buat toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid #007bff;
      animation: slideIn 0.3s ease-out;
      position: relative;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">ℹ️</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
            ${title}
          </div>
          <div style="color: #666; font-size: 14px;">
            ${message}
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="border: none; background: none; font-size: 20px; cursor: pointer; color: #999; padding: 0; width: 24px; height: 24px;">
          ×
        </button>
      </div>
    `;

    // Tambahkan style animasi jika belum ada
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    console.log('✅ Toast shown:', title, message);
  }
}

export default Toast;