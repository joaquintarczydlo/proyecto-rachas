import {
  calcularEstadoDesafio,
  construirFiltroEstado,
  diasIncluidosEntreFechas,
  esFechaValida,
  filtroDesafiosVigentesDePersona,
  generarCodigoInvitacion,
  getHoyDesafio,
  parseFechaCalendario,
  sumarDiasFechaCalendario,
  validarRangoFechas,
} from './desafio.utils';

describe('desafio.utils', () => {
  describe('esFechaValida', () => {
    it('debe aceptar fechas de calendario reales en formato YYYY-MM-DD', () => {
      expect(esFechaValida('2026-10-16')).toBe(true);
      expect(esFechaValida('2028-02-29')).toBe(true); // bisiesto
    });

    it('debe rechazar formatos inválidos o fechas inexistentes', () => {
      expect(esFechaValida('16-10-2026')).toBe(false);
      expect(esFechaValida('2026-10-16T00:00:00Z')).toBe(false);
      expect(esFechaValida('2026-02-30')).toBe(false);
      expect(esFechaValida('2026-13-01')).toBe(false);
      expect(esFechaValida('')).toBe(false);
      expect(esFechaValida(null as any)).toBe(false);
    });
  });

  describe('sumarDiasFechaCalendario y parseFechaCalendario', () => {
    it('debe sumar y restar días sobre fechas de calendario', () => {
      expect(sumarDiasFechaCalendario('2026-10-16', 5)).toBe('2026-10-21');
      expect(sumarDiasFechaCalendario('2026-10-31', 1)).toBe('2026-11-01');
      expect(sumarDiasFechaCalendario('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('debe parsear la fecha como Date local sin desfase de UTC', () => {
      const date = parseFechaCalendario('2026-10-16');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(9);
      expect(date.getDate()).toBe(16);
    });
  });

  describe('diasIncluidosEntreFechas', () => {
    it('debe contar el día de inicio y el de fin', () => {
      expect(diasIncluidosEntreFechas('2026-10-16', '2026-10-16')).toBe(1);
      expect(diasIncluidosEntreFechas('2026-10-16', '2026-10-18')).toBe(3);
      expect(diasIncluidosEntreFechas('2026-12-30', '2027-01-02')).toBe(4);
    });
  });

  describe('validarRangoFechas', () => {
    const hoy = '2026-10-16';

    it('debe devolver null cuando el rango es válido', () => {
      expect(validarRangoFechas('2026-11-01', '2026-11-30', hoy)).toBeNull();
      expect(validarRangoFechas('2026-10-16', '2026-10-18', hoy)).toBeNull(); // empieza hoy
      expect(validarRangoFechas('2026-11-01', '2026-11-03', hoy)).toBeNull(); // 3 días exactos
    });

    it('debe rechazar un inicio en el pasado', () => {
      expect(validarRangoFechas('2026-10-15', '2026-11-01', hoy)).toContain(
        'no puede ser anterior a hoy',
      );
    });

    it('debe rechazar un fin anterior al inicio', () => {
      expect(validarRangoFechas('2026-11-10', '2026-11-01', hoy)).toContain(
        'no puede ser anterior a la fecha de inicio',
      );
    });

    it('debe rechazar duraciones fuera del rango de 3 a 90 días', () => {
      expect(validarRangoFechas('2026-11-01', '2026-11-02', hoy)).toContain(
        'debe durar entre 3 y 90 días',
      );
      expect(validarRangoFechas('2026-11-01', '2027-01-30', hoy)).toContain(
        'debe durar entre 3 y 90 días',
      );
    });

    it('debe rechazar fechas con formato inválido', () => {
      expect(validarRangoFechas('ayer', '2026-11-10', hoy)).toContain(
        'no es una fecha válida',
      );
      expect(validarRangoFechas('2026-11-01', '2026-11-30', hoy)).toBeNull();
      expect(validarRangoFechas('2026-11-01', 'no-fin', hoy)).toContain(
        'La fecha de fin',
      );
    });
  });

  describe('calcularEstadoDesafio', () => {
    const desafio = {
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-30',
      cancelado: false,
    };

    it('debe devolver PROGRAMADO antes del día de inicio', () => {
      expect(calcularEstadoDesafio(desafio, '2026-10-31')).toBe('PROGRAMADO');
    });

    it('debe devolver ACTIVO el primer día, un día intermedio y el último día (inclusive)', () => {
      expect(calcularEstadoDesafio(desafio, '2026-11-01')).toBe('ACTIVO');
      expect(calcularEstadoDesafio(desafio, '2026-11-15')).toBe('ACTIVO');
      expect(calcularEstadoDesafio(desafio, '2026-11-30')).toBe('ACTIVO');
    });

    it('debe devolver FINALIZADO después del día de fin', () => {
      expect(calcularEstadoDesafio(desafio, '2026-12-01')).toBe('FINALIZADO');
    });

    it('debe devolver CANCELADO aunque las fechas sigan vigentes', () => {
      expect(
        calcularEstadoDesafio({ ...desafio, cancelado: true }, '2026-11-15'),
      ).toBe('CANCELADO');
      expect(
        calcularEstadoDesafio({ ...desafio, cancelado: true }, '2026-10-01'),
      ).toBe('CANCELADO');
    });

    it('debe usar el día de hoy por defecto', () => {
      expect(calcularEstadoDesafio(desafio)).toBe('PROGRAMADO');
    });
  });

  describe('generarCodigoInvitacion', () => {
    it('debe generar códigos de 6 caracteres con el alfabeto permitido', () => {
      const codigo = generarCodigoInvitacion();
      expect(codigo).toHaveLength(6);
      expect(codigo).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    });

    it('debe generar códigos distintos en cada llamada', () => {
      const codigos = new Set(
        Array.from({ length: 50 }, () => generarCodigoInvitacion()),
      );
      expect(codigos.size).toBeGreaterThan(1);
    });
  });

  describe('getHoyDesafio', () => {
    it('debe devolver la fecha de hoy en formato YYYY-MM-DD', () => {
      expect(getHoyDesafio()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('construirFiltroEstado', () => {
    const hoy = '2026-10-16';

    it('debe construir el filtro de CANCELADO', () => {
      expect(construirFiltroEstado('CANCELADO', hoy)).toEqual({
        cancelado: true,
      });
    });

    it('debe construir el filtro de PROGRAMADO', () => {
      expect(construirFiltroEstado('PROGRAMADO', hoy)).toEqual({
        cancelado: { $ne: true },
        fechaInicio: { $gt: hoy },
      });
    });

    it('debe construir el filtro de ACTIVO (fechas inclusive)', () => {
      expect(construirFiltroEstado('ACTIVO', hoy)).toEqual({
        cancelado: { $ne: true },
        fechaInicio: { $lte: hoy },
        fechaFin: { $gte: hoy },
      });
    });

    it('debe construir el filtro de FINALIZADO', () => {
      expect(construirFiltroEstado('FINALIZADO', hoy)).toEqual({
        cancelado: { $ne: true },
        fechaFin: { $lt: hoy },
      });
    });

    it('debe coincidir con calcularEstadoDesafio en todos los estados', () => {
      const hoy = '2026-10-16';

      /** Evalúa un filtro mínimo de Mongo contra un desafío de prueba. */
      const cumpleFiltro = (
        desafio: Record<string, any>,
        filtro: Record<string, any>,
      ): boolean =>
        Object.entries(filtro).every(([campo, condicion]) => {
          const valor = desafio[campo];
          if (condicion === true || condicion === false) {
            return valor === condicion;
          }
          if (condicion === null) {
            return valor !== true; // '$ne: true' incluye también campos ausentes
          }
          return Object.entries(condicion as Record<string, any>).every(
            ([op, limite]) => {
              switch (op) {
                case '$ne':
                  return valor !== limite;
                case '$gt':
                  return valor > limite;
                case '$gte':
                  return valor >= limite;
                case '$lt':
                  return valor < limite;
                case '$lte':
                  return valor <= limite;
              }
            },
          );
        });

      const muestras = [
        {
          fechaInicio: '2026-11-01',
          fechaFin: '2026-11-30',
          cancelado: false,
        }, // PROGRAMADO
        {
          fechaInicio: '2026-10-01',
          fechaFin: '2026-10-31',
          cancelado: false,
        }, // ACTIVO
        {
          fechaInicio: '2026-10-15',
          fechaFin: '2026-10-16',
          cancelado: false,
        }, // ACTIVO (hoy es el último día)
        {
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-30',
          cancelado: false,
        }, // FINALIZADO
        {
          fechaInicio: '2026-11-01',
          fechaFin: '2026-11-30',
          cancelado: true,
        }, // CANCELADO
      ];

      for (const desafio of muestras) {
        const estado = calcularEstadoDesafio(desafio, hoy);
        const filtro = construirFiltroEstado(estado, hoy);
        expect(cumpleFiltro(desafio, filtro)).toBe(true);
      }
    });
  });

  describe('filtroDesafiosVigentesDePersona', () => {
    it('debe filtrar los desafíos vigentes (PROGRAMADO o ACTIVO) de una persona', () => {
      expect(filtroDesafiosVigentesDePersona('id123', '2026-10-16')).toEqual({
        participantes: 'id123',
        cancelado: { $ne: true },
        fechaFin: { $gte: '2026-10-16' },
      });
    });
  });
});
