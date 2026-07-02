// ═══════════════════════════════════════════════════════════════════════════
// 9. MÓDULO: HORARIOS (Business Logic Limpio)
// ═══════════════════════════════════════════════════════════════════════════

APP.Modules = APP.Modules || {};

APP.Modules.Horarios = {
  // Estado local del módulo
  state: {
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    semana: 1
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS: Obtener datos calculados
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtener trabajadores activos
   * @returns {Array} Lista de trabajadores
   */
  getTrabajadores: function() {
    return APP.State.getAll('personal').filter(p => p.activo !== false);
  },

  /**
   * Obtener turnos del mes/semana
   * @returns {Map<id, turno>}
   */
  getTurnosActivos: function() {
    return new Map(
      APP.State.getAll('turnos')
        .filter(t => this._turnoAplicaAlMes(t))
    );
  },

  /**
   * Calcular horas trabajadas por persona en la semana
   * @param {string} personalId
   * @returns {number} Horas totales
   */
  calcularHorasPorPersona: function(personalId) {
    let total = 0;

    for (let dia = 1; dia <= 7; dia++) {
      const turno = APP.State.getAll('turnos').find(t =>
        String(t.personal_id) === String(personalId) &&
        Number(t.dia_semana) === dia &&
        this._turnoAplicaAlMes(t)
      );

      if (turno) {
        const horas = parseFloat(APP.Utils.calcularHoras(turno.hora_inicio, turno.hora_fin));
        total += isNaN(horas) ? 0 : horas;
      }
    }

    return Math.round(total * 10) / 10; // Redondear a 1 decimal
  },

  /**
   * Obtener turno específico
   * @param {string} personalId
   * @param {number} diaSemana (1-7)
   * @returns {Object|null}
   */
  getTurno: function(personalId, diaSemana) {
    return APP.State.getAll('turnos').find(t =>
      String(t.personal_id) === String(personalId) &&
      Number(t.dia_semana) === diaSemana &&
      this._turnoAplicaAlMes(t)
    ) || null;
  },

  /**
   * Validar si un turno aplica al mes/año seleccionado
   * @private
   */
  _turnoAplicaAlMes: function(turno) {
    // Si no tiene mes/año, asumir que aplica (plantilla recurrente)
    if (!turno.mes || !turno.anio) return true;

    return Number(turno.mes) === this.state.mes &&
           Number(turno.anio) === this.state.anio;
  },

  /**
   * Calcular rango de fechas de la semana actual
   * @returns {Object} {inicio: Date, fin: Date}
   */
  getRangoSemana: function() {
    const primerDia = new Date(this.state.anio, this.state.mes - 1, 1);
    const primerDiaDelMes = primerDia.getDay();
    const diaInicio = primerDiaDelMes === 0 ? -6 : 2 - primerDiaDelMes;

    const diaInicioSemana = diaInicio + ((this.state.semana - 1) * 7);

    const inicio = new Date(this.state.anio, this.state.mes - 1, diaInicioSemana);
    const fin = new Date(this.state.anio, this.state.mes - 1, diaInicioSemana + 6);

    return { inicio, fin };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACCIONES: Guardar/eliminar datos
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Guardar turno
   * @param {Object} turno
   * @returns {Promise}
   */
  async guardarTurno(turno) {
    try {
      // Asegurar mes/año
      turno.mes = this.state.mes;
      turno.anio = this.state.anio;

      // Validar
      const validation = APP.Validators.turno(turno);
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }

      // Guardar
      await APP.API.saveTurno(turno);

      APP.UI.success('Turno guardado');
      return true;
    } catch (error) {
      APP.UI.error(`Error: ${error.message}`);
      return false;
    }
  },

  /**
   * Eliminar turno
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async eliminarTurno(id) {
    try {
      const confirmed = await APP.UI.confirm(
        '¿Eliminar este turno?',
        async () => {
          await APP.API.deleteTurno(id);
          APP.UI.success('Turno eliminado');
          this.render();
        }
      );

      return confirmed;
    } catch (error) {
      APP.UI.error(`Error: ${error.message}`);
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NAVEGACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ir al mes anterior
   */
  mesPrevio: function() {
    this.state.mes--;
    if (this.state.mes < 1) {
      this.state.mes = 12;
      this.state.anio--;
    }
    this.state.semana = 1; // Resetear a semana 1
    this.render();
  },

  /**
   * Ir al mes siguiente
   */
  mesSiguiente: function() {
    this.state.mes++;
    if (this.state.mes > 12) {
      this.state.mes = 1;
      this.state.anio++;
    }
    this.state.semana = 1;
    this.render();
  },

  /**
   * Ir a hoy
   */
  irAHoy: function() {
    const now = new Date();
    this.state.mes = now.getMonth() + 1;
    this.state.anio = now.getFullYear();
    this.state.semana = 1;
    this.render();
  },

  /**
   * Ir a semana anterior
   */
  semanavPrevio: function() {
    this.state.semana--;
    if (this.state.semana < 1) {
      this.mesPrevio();
      this.state.semana = 4; // Aproximado (podría ser 3-5)
    } else {
      this.render();
    }
  },

  /**
   * Ir a semana siguiente
   */
  semanaSiguiente: function() {
    this.state.semana++;
    if (this.state.semana > 4) {
      this.mesSiguiente();
      this.state.semana = 1;
    } else {
      this.render();
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZADO
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Renderizar tabla de horarios
   */
  render: function() {
    try {
      const container = document.getElementById('horariosBody');
      if (!container) {
        APP.Logger.warn('Contenedor horarios no encontrado');
        return;
      }

      const trabajadores = this.getTrabajadores();

      if (!trabajadores.length) {
        container.innerHTML = `
          <tr>
            <td colspan="9" style="text-align:center;padding:24px;color:var(--tx1)">
              Sin trabajadores registrados
            </td>
          </tr>
        `;
        return;
      }

      // Actualizar label de semana
      const rangoSemana = this.getRangoSemana();
      const labelEl = document.getElementById('horWeekLabel');
      if (labelEl) {
        labelEl.textContent = `Sem ${this.state.semana} (${rangoSemana.inicio.getDate()}-${rangoSemana.fin.getDate()})`;
      }

      // Generar HTML
      let html = '';

      trabajadores.forEach(trabajador => {
        html += '<tr>';
        html += `
          <td style="font-weight:700">
            ${APP.Utils.escapeHtml(trabajador.nombre)}
            <div style="font-size:11px;color:var(--tx1);font-weight:400">
              ${APP.Utils.escapeHtml(trabajador.cargo || '')}
            </div>
          </td>
        `;

        // Columnas de días
        for (let dia = 1; dia <= 7; dia++) {
          const turno = this.getTurno(trabajador.id, dia);
          html += '<td class="turno-cell" onclick="APP.Modules.Horarios.openModal(\'' + trabajador.id + '\',' + dia + ')">';

          if (turno) {
            html += `
              <span class="turno-chip">
                ${turno.hora_inicio.substring(0, 5)} – ${turno.hora_fin.substring(0, 5)}
              </span>
            `;
          } else {
            html += '<span class="turno-empty">+ Agregar</span>';
          }

          html += '</td>';
        }

        // Columna de horas
        const horas = this.calcularHorasPorPersona(trabajador.id);
        html += `
          <td style="background:var(--bd);text-align:center;font-weight:700;color:var(--gdk);padding:8px 4px">
            ${horas}h
          </td>
        `;

        html += '</tr>';
      });

      container.innerHTML = html;
      APP.Logger.info(`✓ Horarios renderizados (${trabajadores.length} trabajadores)`);
    } catch (error) {
      APP.Logger.error('Error renderizando horarios', error);
      APP.UI.error('Error al mostrar horarios');
    }
  },

  /**
   * Abrir modal para editar turno
   */
  openModal: function(personalId, dia) {
    // Este método será implementado en la UI
    APP.Logger.debug(`Abriendo modal: Personal ${personalId}, Día ${dia}`);
  }
};

console.log('✓ Módulo Horarios Cargado');
