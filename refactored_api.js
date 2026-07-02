// ═══════════════════════════════════════════════════════════════════════════
// 7. API MODULE - SUPABASE + LOCALSTORAGE (CON RETRY Y ERROR HANDLING)
// ═══════════════════════════════════════════════════════════════════════════

APP.API = {
  db: null,
  isConnected: false,

  // Inicializar conexión a Supabase
  async init() {
    APP.Logger.info('🔄 Inicializando API...');
    APP.State.setUI('cargando', true);

    try {
      const { url, key } = APP.config.supabase;

      if (!url || !key) {
        throw new Error('Credenciales Supabase no configuradas');
      }

      // Crear cliente
      this.db = supabase.createClient(url, key);

      // Probar conexión
      const conectado = await this._testConnection();

      if (conectado) {
        this.isConnected = true;
        APP.Logger.info('✅ Conectado a Supabase');
        
        // Cargar datos desde Supabase
        await this.loadAllData();
      } else {
        this.isConnected = false;
        APP.Logger.warn('⚠️ Supabase no disponible - usando localStorage');
        
        // Cargar desde localStorage
        await this._loadFromLocalStorage();
      }

      APP.State.setUI('conectado', this.isConnected);
      return true;
    } catch (error) {
      APP.Logger.error('Error inicializando API', error);
      APP.State.setUI('conectado', false);
      
      // Fallback a localStorage
      await this._loadFromLocalStorage();
      return false;
    } finally {
      APP.State.setUI('cargando', false);
    }
  },

  // Test de conexión a Supabase
  async _testConnection() {
    if (!this.db) return false;

    try {
      const result = await Promise.race([
        this.db.from('personal').select('id').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), APP.config.supabase.timeout)
        )
      ]);

      return !result.error;
    } catch (e) {
      return false;
    }
  },

  // Cargar TODO desde Supabase
  async loadAllData() {
    if (!this.isConnected) {
      APP.Logger.warn('No hay conexión - saltando carga de Supabase');
      return;
    }

    try {
      APP.Logger.info('📥 Cargando datos desde Supabase...');

      const [
        personal,
        turnos,
        vitacora,
        eventos,
        locales,
        pagos
      ] = await Promise.all([
        this._fetchWithRetry('personal'),
        this._fetchWithRetry('turnos'),
        this._fetchWithRetry('vitacora'),
        this._fetchWithRetry('eventos'),
        this._fetchWithRetry('locales'),
        this._fetchWithRetry('pagos_gc')
      ]);

      // Cargar a State
      await APP.Storage.sync('personal', personal?.data);
      await APP.Storage.sync('turnos', turnos?.data);
      await APP.Storage.sync('vitacora', vitacora?.data);
      await APP.Storage.sync('eventos', eventos?.data);
      await APP.Storage.sync('locales', locales?.data);
      await APP.Storage.sync('pagos', pagos?.data);

      APP.Logger.info('✅ Datos cargados desde Supabase');
      return true;
    } catch (error) {
      APP.Logger.error('Error cargando datos de Supabase', error);
      return false;
    }
  },

  // Fetch con retry
  async _fetchWithRetry(tabla, retries = APP.config.supabase.retries) {
    if (!this.db) return { error: 'No DB connection', data: null };

    let lastError = null;

    for (let i = 0; i < retries; i++) {
      try {
        const result = await Promise.race([
          this.db.from(tabla).select('*'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), APP.config.supabase.timeout)
          )
        ]);

        if (!result.error) {
          APP.Logger.debug(`✓ Tabla ${tabla} cargada (intento ${i + 1})`);
          return result;
        }

        lastError = result.error;
      } catch (e) {
        lastError = e;
      }

      // Esperar antes de reintentar
      if (i < retries - 1) {
        await APP.Utils.sleep(500 * (i + 1));
      }
    }

    APP.Logger.warn(`⚠️ Falló ${tabla} después de ${retries} intentos`, lastError);
    return { error: lastError, data: null };
  },

  // Cargar desde localStorage (fallback)
  async _loadFromLocalStorage() {
    APP.Logger.info('📂 Cargando datos de localStorage...');

    try {
      const entidades = ['personal', 'turnos', 'vitacora', 'eventos', 'locales', 'pagos'];

      for (const entidad of entidades) {
        const data = APP.Storage.load(entidad);
        if (data) {
          APP.State.loadMultiple(entidad, data);
          APP.Logger.debug(`✓ ${entidad} cargado de localStorage`);
        }
      }

      return true;
    } catch (error) {
      APP.Logger.error('Error cargando de localStorage', error);
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OPERACIONES CRUD
  // ─────────────────────────────────────────────────────────────────────────

  // Guardar turno (LOCAL + REMOTO)
  async saveTurno(turno) {
    // Validar
    const validation = APP.Validators.turno(turno);
    if (!validation.valid) {
      APP.Logger.error('Turno inválido', validation.errors);
      throw new Error(validation.errors.join(', '));
    }

    // Guardar localmente
    APP.State.set('turnos', turno.id, turno);
    APP.Storage.save('turnos', APP.State.getAll('turnos'));

    // Guardar en Supabase (async, no bloquea)
    if (this.isConnected) {
      try {
        await this.db.from('turnos').upsert(turno);
        APP.Logger.info('✓ Turno guardado en Supabase');
      } catch (error) {
        APP.Logger.warn('⚠️ Error guardando en Supabase (localStorage OK)', error);
      }
    }

    return turno.id;
  },

  // Guardar entrada de vitácora
  async saveVitacora(entry) {
    // Validar
    const validation = APP.Validators.vitacora(entry);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Garantizar ID
    if (!entry.id) {
      entry.id = APP.Utils.generateId();
    }

    // Guardar localmente
    APP.State.set('vitacora', entry.id, entry);
    APP.Storage.save('vitacora', APP.State.getAll('vitacora'));

    // Guardar en Supabase
    if (this.isConnected) {
      try {
        await this.db.from('vitacora').upsert(entry);
        APP.Logger.info('✓ Vitácora guardada en Supabase');
      } catch (error) {
        APP.Logger.warn('⚠️ Error en Supabase (localStorage OK)', error);
      }
    }

    return entry.id;
  },

  // Eliminar turno
  async deleteTurno(id) {
    try {
      // Eliminar localmente
      APP.State.delete('turnos', id);
      APP.Storage.save('turnos', APP.State.getAll('turnos'));

      // Eliminar en Supabase
      if (this.isConnected) {
        await this.db.from('turnos').delete().eq('id', String(id));
      }

      APP.Logger.info('✓ Turno eliminado');
      return true;
    } catch (error) {
      APP.Logger.error('Error eliminando turno', error);
      throw error;
    }
  },

  // Eliminar vitácora
  async deleteVitacora(id) {
    try {
      APP.State.delete('vitacora', id);
      APP.Storage.save('vitacora', APP.State.getAll('vitacora'));

      if (this.isConnected) {
        await this.db.from('vitacora').delete().eq('id', String(id));
      }

      APP.Logger.info('✓ Entrada de vitácora eliminada');
      return true;
    } catch (error) {
      APP.Logger.error('Error eliminando vitácora', error);
      throw error;
    }
  },

  // Reconectar (para cuando no hay internet)
  async reconnect(url = null, key = null) {
    if (url && key) {
      APP.config.supabase.url = url;
      APP.config.supabase.key = key;
    }

    this.db = null;
    this.isConnected = false;

    return await this.init();
  }
};

console.log('✓ API Module Cargado');
