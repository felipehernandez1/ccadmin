/**
 * CC ADMIN · PLAZA LO CASTILLO
 * 
 * Refactored Professional Architecture v1.0
 * 
 * ARQUITECTURA:
 * ============
 * 
 * APP (Namespace Global)
 *   ├── Config (Configuración)
 *   ├── State (Estado Global - Normalizado)
 *   ├── API (Supabase + localStorage)
 *   ├── Utils (Utilidades compartidas)
 *   ├── Validators (Validación de datos)
 *   ├── Modules (Módulos funcionales)
 *   │   ├── Horarios
 *   │   ├── Vitácora
 *   │   ├── Calendario
 *   │   ├── Locales
 *   │   └── ...
 *   └── UI (Renderizado)
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN CENTRALIZADA
// ═══════════════════════════════════════════════════════════════════════════

const APP = {
  version: '5.1.0',
  name: 'CC Admin · Plaza Lo Castillo',
  
  // Config de Supabase
  supabase: {
    url: 'https://uhvtrstaezrghxqejtse.supabase.co',
    key: 'sb_publishable_FZr4jBHKuHXJjrglk2tLDA_zPmYiRqr',
    timeout: 5000,
    retries: 3
  },
  
  // Configuración de app
  config: {
    totalLocales: 196,
    diasSemana: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    mesesCompleto: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    mesesCorto: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    categorias: {
      mantenimiento: { color: '#EF9F27', icon: '🔧', label: 'Mantenimiento' },
      reunion: { color: '#7F77DD', icon: '📞', label: 'Reunión' },
      contrato: { color: '#185FA5', icon: '📋', label: 'Contrato' },
      incidencia: { color: '#E24B4A', icon: '⚠️', label: 'Incidencia' },
      aviso: { color: '#00A3A3', icon: '📢', label: 'Aviso locatario' },
      marketing: { color: '#1D9E75', icon: '📊', label: 'Marketing' }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. STATE MANAGEMENT - NORMALIZADO Y LIMPIO
// ═══════════════════════════════════════════════════════════════════════════

APP.State = {
  // Estado centralizado
  _data: {
    personal: new Map(),        // Trabajadores: id → objeto
    turnos: new Map(),          // Turnos: id → objeto
    vitacora: new Map(),        // Auditoría: id → objeto
    eventos: new Map(),         // Calendario: id → objeto
    locales: new Map(),         // Locales: id → objeto
    locatarios: new Map(),      // Locatarios: id → objeto
    contratos: new Map(),       // Contratos: id → objeto
    pagos: new Map(),           // Pagos: id → objeto
    incidencias: new Map()      // Incidencias: id → objeto
  },

  // Estado de UI
  _ui: {
    seccionActual: 'inicio',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    semana: 1,
    diaSeleccionado: null,
    conectado: false,
    cargando: false
  },

  // Getters seguros
  get: function(entidad, id) {
    if (!this._data[entidad]) return null;
    return this._data[entidad].get(id);
  },

  getAll: function(entidad) {
    if (!this._data[entidad]) return [];
    return Array.from(this._data[entidad].values());
  },

  // Setters con validación
  set: function(entidad, id, valor) {
    if (!this._data[entidad]) {
      console.error(`❌ Entidad desconocida: ${entidad}`);
      return false;
    }
    if (!id) {
      console.error(`❌ ID requerido para ${entidad}`);
      return false;
    }
    this._data[entidad].set(id, valor);
    return true;
  },

  // Agregar múltiples registros (para inicialización)
  loadMultiple: function(entidad, items = []) {
    if (!this._data[entidad]) return false;
    this._data[entidad].clear();
    items.forEach(item => {
      if (item.id) this._data[entidad].set(item.id, item);
    });
    return true;
  },

  // Eliminar
  delete: function(entidad, id) {
    if (!this._data[entidad]) return false;
    return this._data[entidad].delete(id);
  },

  // Limpiar todo
  clear: function() {
    Object.keys(this._data).forEach(k => this._data[k].clear());
  },

  // Obtener estado UI
  getUI: function(key) {
    return this._ui[key];
  },

  setUI: function(key, value) {
    this._ui[key] = value;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. LOGGER PROFESIONAL
// ═══════════════════════════════════════════════════════════════════════════

APP.Logger = {
  levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
  currentLevel: 1, // INFO por defecto

  // Colores para consola
  colors: {
    debug: '%cDEBUG',
    info: '%c✓ INFO',
    warn: '%c⚠ WARN',
    error: '%c❌ ERROR'
  },

  log: function(level, message, data = null) {
    if (level < this.currentLevel) return;

    const timestamp = new Date().toLocaleTimeString('es-CL');
    const levelName = Object.keys(this.levels).find(k => this.levels[k] === level);

    if (level === this.levels.ERROR) {
      console.error(`[${timestamp}] ${message}`, data);
    } else if (level === this.levels.WARN) {
      console.warn(`[${timestamp}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${message}`, data);
    }
  },

  debug: (msg, data) => APP.Logger.log(APP.Logger.levels.DEBUG, msg, data),
  info: (msg, data) => APP.Logger.log(APP.Logger.levels.INFO, msg, data),
  warn: (msg, data) => APP.Logger.log(APP.Logger.levels.WARN, msg, data),
  error: (msg, data) => APP.Logger.log(APP.Logger.levels.ERROR, msg, data)
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. VALIDADORES DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

APP.Validators = {
  // Validar turno
  turno: function(t) {
    const errors = [];
    
    if (!t.id) errors.push('ID requerido');
    if (!t.personal_id) errors.push('Personal requerido');
    if (!t.hora_inicio) errors.push('Hora inicio requerida');
    if (!t.hora_fin) errors.push('Hora fin requerida');
    
    if (t.hora_inicio && t.hora_fin) {
      const ini = this._parseTime(t.hora_inicio);
      const fin = this._parseTime(t.hora_fin);
      if (fin <= ini) errors.push('Hora fin debe ser después de inicio');
    }
    
    if (t.dia_semana && (t.dia_semana < 1 || t.dia_semana > 7)) {
      errors.push('Día de semana inválido');
    }
    
    if (t.mes && (t.mes < 1 || t.mes > 12)) {
      errors.push('Mes inválido');
    }
    
    return { valid: errors.length === 0, errors };
  },

  // Validar vitácora
  vitacora: function(v) {
    const errors = [];
    
    if (!v.id) errors.push('ID requerido');
    if (!v.fecha) errors.push('Fecha requerida');
    if (!v.tipo) errors.push('Tipo requerido');
    if (!v.descripcion) errors.push('Descripción requerida');
    
    if (v.fecha) {
      try {
        new Date(v.fecha);
      } catch (e) {
        errors.push('Fecha inválida');
      }
    }
    
    return { valid: errors.length === 0, errors };
  },

  // Helper: parsear hora HH:MM
  _parseTime: function(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  },

  // Validar email
  email: function(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validar RUT chileno
  rut: function(rut) {
    if (!rut) return false;
    rut = rut.replace(/[.\-]/g, '');
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
    return true;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. UTILIDADES COMPARTIDAS
// ═══════════════════════════════════════════════════════════════════════════

APP.Utils = {
  // Generar ID único (timestamp)
  generateId: () => Date.now().toString(),

  // Formatear dinero
  formatMoney: function(amount) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  },

  // Formatear fecha
  formatDate: function(dateStr, formato = 'corto') {
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return dateStr;

    const opciones = {
      corto: { day: '2-digit', month: 'short', year: '2-digit' },
      largo: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    };

    return date.toLocaleDateString('es-CL', opciones[formato] || opciones.corto);
  },

  // Calcular horas entre dos tiempos
  calcularHoras: function(horaInicio, horaFin) {
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    const minutos = (hf * 60 + mf) - (hi * 60 + mi);
    return (minutos / 60).toFixed(1);
  },

  // Escapar HTML (prevenir XSS)
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Sleep async
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. SINCRONIZACIÓN: LOCAL + REMOTO (ROBUSTO)
// ═══════════════════════════════════════════════════════════════════════════

APP.Storage = {
  // Claves de localStorage
  keys: {
    personal: 'cc_personal_v1',
    turnos: 'cc_turnos_v1',
    vitacora: 'cc_vitacora_v1',
    eventos: 'cc_eventos_v1',
    locales: 'cc_locales_v1',
    pagos: 'cc_pagos_v1'
  },

  // Guardar en localStorage
  save: function(key, data) {
    try {
      localStorage.setItem(this.keys[key], JSON.stringify(data));
      APP.Logger.debug(`✓ Guardado: ${key}`);
      return true;
    } catch (e) {
      APP.Logger.error(`Error guardando ${key}`, e);
      return false;
    }
  },

  // Cargar de localStorage
  load: function(key) {
    try {
      const data = localStorage.getItem(this.keys[key]);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      APP.Logger.error(`Error cargando ${key}`, e);
      return null;
    }
  },

  // Sincronizar entidad (localStorage ← Supabase)
  async sync(entidad, supabaseData = null) {
    try {
      // Si no hay datos de Supabase, usar localStorage
      const data = supabaseData || this.load(entidad) || [];
      
      // Normalizar y cargar a State
      APP.State.loadMultiple(entidad, data);
      
      // Guardar a localStorage
      this.save(entidad, data);
      
      APP.Logger.info(`✓ Sincronizado: ${entidad} (${data.length} registros)`);
      return true;
    } catch (e) {
      APP.Logger.error(`Error sincronizando ${entidad}`, e);
      return false;
    }
  }
};

console.log('✓ Arquitectura Core Cargada');
