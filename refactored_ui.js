// ═══════════════════════════════════════════════════════════════════════════
// 8. UI MODULE - NOTIFICACIONES PROFESIONALES (SIN ALERTS)
// ═══════════════════════════════════════════════════════════════════════════

APP.UI = {
  notificationStack: [],

  // Mostrar notificación
  notify: function(message, type = 'info', duration = 4000) {
    const id = `notify-${Date.now()}`;
    const colors = {
      success: '#1D9E75',
      error: '#E24B4A',
      warn: '#EF9F27',
      info: '#185FA5'
    };

    const icons = {
      success: '✓',
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️'
    };

    // Crear elemento
    const notification = document.createElement('div');
    notification.id = id;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 14px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      font-weight: 500;
      max-width: 350px;
      word-wrap: break-word;
      z-index: 9999;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <span style="margin-right: 8px;">${icons[type]}</span>
      <span>${APP.Utils.escapeHtml(message)}</span>
    `;

    document.body.appendChild(notification);
    this.notificationStack.push(id);

    // Reposicionar anteriores
    this._repositionNotifications();

    // Auto-remover
    if (duration > 0) {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.style.animation = 'slideOutRight 0.3s ease-in';
          setTimeout(() => el.remove(), 300);
        }
      }, duration);
    }

    // Log también
    const logLevel = { success: 'info', error: 'error', warn: 'warn', info: 'info' }[type];
    APP.Logger[logLevel](message);

    return id;
  },

  // Repositicionar notificaciones en cascada
  _repositionNotifications: function() {
    const notifications = document.querySelectorAll('[id^="notify-"]');
    let top = 20;
    notifications.forEach(notif => {
      notif.style.top = top + 'px';
      top += notif.offsetHeight + 10;
    });
  },

  // Atajos
  success: (msg, duration = 3000) => APP.UI.notify(msg, 'success', duration),
  error: (msg, duration = 5000) => APP.UI.notify(msg, 'error', duration),
  warn: (msg, duration = 4000) => APP.UI.notify(msg, 'warn', duration),
  info: (msg, duration = 3000) => APP.UI.notify(msg, 'info', duration),

  // Modal de confirmación (reemplazar alerts)
  confirm: function(message, onConfirm, onCancel = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: var(--bg0);
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        max-width: 400px;
        text-align: center;
      `;

      modal.innerHTML = `
        <p style="margin-bottom: 20px; color: var(--tx0); font-size: 15px;">
          ${APP.Utils.escapeHtml(message)}
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="confirm-yes" style="
            background: var(--blue);
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-family: inherit;
          ">Sí, eliminar</button>
          <button id="confirm-no" style="
            background: var(--bg1);
            color: var(--tx0);
            padding: 8px 16px;
            border: 1px solid var(--bd);
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-family: inherit;
          ">Cancelar</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      document.getElementById('confirm-yes').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
        resolve(true);
      };

      document.getElementById('confirm-no').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
        resolve(false);
      };

      // Cerrar con ESC
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', handleEsc);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  },

  // Loading state
  setLoading: function(loading, message = null) {
    const loader = document.getElementById('app-loader');
    if (!loader) return;

    if (loading) {
      loader.style.display = 'flex';
      if (message) {
        const msg = loader.querySelector('[role="status"]');
        if (msg) msg.textContent = message;
      }
    } else {
      loader.style.display = 'none';
    }
  }
};

// Agregar estilos de animación a head
if (!document.getElementById('app-animations')) {
  const style = document.createElement('style');
  style.id = 'app-animations';
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

console.log('✓ UI Module Cargado');
