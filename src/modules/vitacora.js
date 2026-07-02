// ═══════════════════════════════════════════════════════════════════════════
// 10. MÓDULO: VITÁCORA (Auditoría del edificio)
// ═══════════════════════════════════════════════════════════════════════════

APP.Modules.Vitacora = {
  state: {
    mes: null,      // null = todos los meses
    tipo: 'todos',  // todos, mantenimiento, reunion, etc
    pagina: 0,
    itemsPorPagina: 50
  },

  /**
   * Obtener todas las entradas (manual + calendario)
   * @returns {Array}
   */
  getAll: function() {
    const manuale = APP.State.getAll('vitacora');
    const calendario = APP.State.getAll('eventos').map(e => ({
      id: e.id,
      fecha: e.start,
      tipo: e.cat || 'otro',
      descripcion: e.title,
      notas: e.notes || '',
      esEvento: true
    }));

    return [...manuale, ...calendario];
  },

  /**
   * Filtrar por mes y tipo
   * @returns {Array}
   */
  getFiltered: function() {
    let datos = this.getAll();

    // Filtrar por tipo
    if (this.state.tipo !== 'todos') {
      datos = datos.filter(v => v.tipo === this.state.tipo);
    }

    // Filtrar por mes
    if (this.state.mes) {
      datos = datos.filter(v => {
        const fecha = v.fecha || '2026-01-01';
        return fecha.startsWith(this.state.mes);
      });
    }

    // Ordenar por fecha (más reciente primero)
    datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return datos;
  },

  /**
   * Guardar entrada de vitácora
   * @param {Object} entry
   * @returns {Promise<boolean>}
   */
  async guardar(entry) {
    try {
      // Auto-generar ID si no existe
      if (!entry.id) {
        entry.id = APP.Utils.generateId();
      }

      // Garantizar fecha
      if (!entry.fecha) {
        entry.fecha = new Date().toISOString().split('T')[0];
      }

      // Validar
      const validation = APP.Validators.vitacora(entry);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      // Guardar
      await APP.API.saveVitacora(entry);

      APP.UI.success('Entrada guardada');
      this.render();
      return true;
    } catch (error) {
      APP.UI.error(`Error: ${error.message}`);
      return false;
    }
  },

  /**
   * Eliminar entrada
   * @param {string} id
   * @param {boolean} esEvento
   * @returns {Promise<boolean>}
   */
  async eliminar(id, esEvento = false) {
    try {
      const confirmed = await APP.UI.confirm(
        '¿Eliminar esta entrada?',
        async () => {
          if (esEvento) {
            const eventos = APP.State.getAll('eventos');
            APP.State.delete('eventos', id);
            APP.Storage.save('eventos', eventos);
          } else {
            await APP.API.deleteVitacora(id);
          }

          APP.UI.success('Entrada eliminada');
          this.render();
        }
      );

      return confirmed;
    } catch (error) {
      APP.UI.error(`Error: ${error.message}`);
      return false;
    }
  },

  /**
   * Cambiar filtro de mes
   * @param {string|null} mes (YYYY-MM o null)
   */
  setMes: function(mes) {
    this.state.mes = mes;
    this.render();
  },

  /**
   * Cambiar filtro de tipo
   * @param {string} tipo
   */
  setTipo: function(tipo) {
    this.state.tipo = tipo;
    this.render();
  },

  /**
   * Renderizar vitácora
   */
  render: function() {
    try {
      const container = document.getElementById('vitacoraList');
      if (!container) {
        APP.Logger.warn('Contenedor vitácora no encontrado');
        return;
      }

      const datos = this.getFiltered();

      if (!datos.length) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--tx1)">
            <div style="font-size:40px;margin-bottom:12px">📓</div>
            <div style="font-size:15px;font-weight:600">Vitácora vacía</div>
            <div style="font-size:13px;margin-top:6px;color:var(--tx2)">
              Agrega entradas o registra actividades
            </div>
          </div>
        `;
        return;
      }

      // Agrupar por fecha
      const porFecha = {};
      datos.forEach(v => {
        const fecha = v.fecha || '2026-01-01';
        if (!porFecha[fecha]) porFecha[fecha] = [];
        porFecha[fecha].push(v);
      });

      // Renderizar
      let html = '';

      Object.keys(porFecha).sort().reverse().forEach(fecha => {
        const d = new Date(fecha + 'T12:00:00');
        const label = d.toLocaleDateString('es-CL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).toUpperCase();

        html += `
          <div style="font-size:11px;font-weight:700;color:var(--tx2);
                      text-transform:uppercase;letter-spacing:.06em;
                      padding:12px 0 6px;border-bottom:.5px solid var(--bd);
                      margin-bottom:8px">
            ${label}
          </div>
        `;

        porFecha[fecha].forEach(v => {
          const cat = APP.config.config.categorias[v.tipo] || {
            color: '#999',
            icon: '📝',
            label: v.tipo
          };

          html += `
            <div style="display:flex;gap:12px;margin-bottom:12px;
                        padding:12px;background:var(--bg1);border-radius:8px;
                        border-left:3px solid ${cat.color}">
              <div style="font-size:20px;flex-shrink:0">${cat.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                  <span style="background:${cat.color}18;color:${cat.color};
                               font-size:11px;padding:3px 9px;border-radius:10px;
                               font-weight:600">
                    ${cat.label}${v.esEvento ? ' (📅)' : ''}
                  </span>
                </div>
                <div style="font-size:14px;color:var(--tx0);margin-bottom:3px;font-weight:600">
                  ${APP.Utils.escapeHtml(v.descripcion)}
                </div>
                ${v.notas ? `
                  <div style="font-size:13px;color:var(--tx1);margin-bottom:3px;font-style:italic">
                    ${APP.Utils.escapeHtml(v.notas)}
                  </div>
                ` : ''}
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button onclick="APP.Modules.Vitacora.openModal('${v.id}')"
                        style="padding:5px 8px;background:var(--blue);color:white;
                               border:none;border-radius:4px;cursor:pointer">
                  ✏️
                </button>
                <button onclick="APP.Modules.Vitacora.eliminar('${v.id}',${v.esEvento})"
                        style="padding:5px 8px;background:var(--rlt);color:var(--rdk);
                               border:none;border-radius:4px;cursor:pointer">
                  🗑
                </button>
              </div>
            </div>
          `;
        });
      });

      container.innerHTML = html;
      APP.Logger.info(`✓ Vitácora renderizada (${datos.length} entradas)`);
    } catch (error) {
      APP.Logger.error('Error renderizando vitácora', error);
      APP.UI.error('Error al mostrar vitácora');
    }
  },

  /**
   * Abrir modal para editar
   * @param {string} id
   */
  openModal: function(id) {
    APP.Logger.debug(`Abriendo vitácora: ${id}`);
  }
};

console.log('✓ Módulo Vitácora Cargado');

// ═════════════════════════════════════════════════════════════════════════════
// INTEGRACIÓN EN HTML
// ═════════════════════════════════════════════════════════════════════════════

/*

PASO 1: Incluir los módulos en el HTML <head> (DESPUÉS de jQuery/Supabase):

<script src="refactored_core.js"></script>
<script src="refactored_api.js"></script>
<script src="refactored_ui.js"></script>
<script src="refactored_horarios.js"></script>
<script src="refactored_vitacora.js"></script>

PASO 2: Inicializar en el <body> (antes de cerrar </body>):

<script>
  // Inicializar app
  APP.API.init().then(() => {
    APP.Modules.Horarios.render();
    APP.Modules.Vitacora.render();
    // ... otros módulos
  });
</script>

PASO 3: Reemplazar event handlers:

// ANTES (viejo):
<button onclick="horNextMes()">Siguiente</button>

// DESPUÉS (nuevo):
<button onclick="APP.Modules.Horarios.mesSiguiente()">Siguiente</button>

PASO 4: Reemplazar alerts con notificaciones:

// ANTES:
alert('¡Guardado!');

// DESPUÉS:
APP.UI.success('¡Guardado!');

// ANTES:
if (!confirm('¿Eliminar?')) return;

// DESPUÉS:
APP.UI.confirm('¿Eliminar?', () => { /* hacer algo */ });

*/

console.log('✓ Guía de Integración completada');
