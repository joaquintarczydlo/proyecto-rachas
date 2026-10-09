import { getFechaCalendario, isValidTimeZone } from './date.utils';

describe('date.utils', () => {
  describe('isValidTimeZone', () => {
    it('debe devolver true para zonas horarias válidas', () => {
      expect(isValidTimeZone('America/Argentina/Buenos_Aires')).toBe(true);
      expect(isValidTimeZone('UTC')).toBe(true);
      expect(isValidTimeZone('Europe/Madrid')).toBe(true);
      expect(isValidTimeZone('America/Montevideo')).toBe(true);
    });

    it('debe devolver false para zonas horarias inválidas o vacías', () => {
      expect(isValidTimeZone('Invalida/Zona')).toBe(false);
      expect(isValidTimeZone('')).toBe(false);
      expect(isValidTimeZone(null as any)).toBe(false);
    });
  });

  describe('getFechaCalendario', () => {
    it('debe devolver la fecha en formato YYYY-MM-DD sin hora ni UTC', () => {
      const fecha = new Date(2026, 9, 9, 10, 0, 0); // 9 de octubre de 2026
      const fechaCalendario = getFechaCalendario('America/Argentina/Buenos_Aires', fecha);
      expect(fechaCalendario).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fechaCalendario).toBe('2026-10-09');
    });

    it('debe lanzar un error si la zona horaria es inválida', () => {
      expect(() => getFechaCalendario('Zona_Invalida')).toThrow('Zona horaria inválida');
    });
  });
});

