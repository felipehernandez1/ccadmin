// ═════════════════════════════════════════════════════════════════════════════
// BRIDGE COMPATIBILITY v5.1.0
// Mapea funciones antiguas a nuevas arquitectura
// ═════════════════════════════════════════════════════════════════════════════

console.log('🔌 Cargando puente de compatibilidad...');

// ─────────────────────────────────────────────────────────────────────────────
// HORARIOS - Mapear funciones viejas a nuevas
// ─────────────────────────────────────────────────────────────────────────────

window.horNextMes = function() {
  APP.Modules.Horarios.mesSiguiente();
};

window.horPrevMes = function() {
  APP.Modules.Horarios.mesPrevio();
};

window.horHoy = function() {
  APP.Modules.Horarios.irAHoy();
};

window.horNextWeek = function() {
  APP.Modules.Horarios.semanaSiguiente();
};

window.horPrevWeek = function() {
  APP.Modules.Horarios.semanaPrevio();
};

// ─────────────────────────────────────────────────────────────────────────────
// VITÁCORA - Mapear funciones viejas a nuevas
// ─────────────────────────────────────────────────────────────────────────────

window.delVit = function(id) {
  APP.Modules.Vitacora.eliminar(id, false);
};

window.editVit = function(id) {
  console.log('Edit vitácora:', id);
};

window.saveVitacora = function(entry) {
  APP.Modules.Vitacora.guardar(entry);
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS → NOTIFICACIONES (reemplazar alerts con UI profesional)
// ─────────────────────────────────────────────────────────────────────────────

const originalAlert = window.alert;
window.alert = function(message) {
  if (!message) return;
  
  // Detectar tipo de mensaje
  if (message.toLowerCase().includes('error')) {
    APP.UI.error(message);
  } else if (message.toLowerCase().includes('advertencia') || message.toLowerCase().includes('⚠')) {
    APP.UI.warn(message);
  } else {
    APP.UI.success(message);
  }
  
  console.log('Alert:', message);
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM → Modal de confirmación
// ─────────────────────────────────────────────────────────────────────────────

const originalConfirm = window.confirm;
window.confirm = function(message) {
  // Para ahora, usar confirm original pero loguear
  console.log('Confirm:', message);
  return originalConfirm(message);
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES GLOBALES
// ─────────────────────────────────────────────────────────────────────────────

// localStorage helpers (compatibilidad)
window.saveLS = function(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error guardando localStorage:', e);
    return false;
  }
};

window.loadLS = function(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error cargando localStorage:', e);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN ADICIONAL
// ─────────────────────────────────────────────────────────────────────────────

// Esperar a que APP esté inicializado
setTimeout(function() {
  if (window.APP && APP.API && APP.API.isConnected !== undefined) {
    console.log('✅ Puente de compatibilidad activo');
    console.log('✅ Funciones antiguas mapeadas a nuevas');
    console.log('✅ Notificaciones activadas');
  }
}, 500);

console.log('✅ Puente de compatibilidad cargado');
