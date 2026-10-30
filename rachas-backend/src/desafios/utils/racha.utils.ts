import {
  parseFechaCalendario,
  sumarDiasFechaCalendario,
} from './desafio.utils';

/**
 * Puntos base que otorga cada check-in, independientemente de la racha.
 */
export const PUNTOS_BASE_POR_CHECK_IN = 10;

/**
 * Bonos por racha actual (incluyendo el check-in que se está registrando):
 * - menor a 3: +0
 * - de 3 a 6: +5
 * - 7 o más: +10
 */
export function bonusPuntosPorRacha(rachaActual: number): number {
  if (rachaActual >= 7) return 10;
  if (rachaActual >= 3) return 5;
  return 0;
}

/**
 * Puntos totales de un check-in: base + bono por racha.
 */
export function calcularPuntosCheckIn(rachaActual: number): number {
  return PUNTOS_BASE_POR_CHECK_IN + bonusPuntosPorRacha(rachaActual);
}

/**
 * Calcula la racha actual de una persona en un desafío.
 *
 * La racha actual es la cantidad de días consecutivos con check-in que
 * termina hoy o ayer (zona horaria de la persona). Si la persona no hizo
 * el de hoy, la racha sigue viva mientras haya terminado ayer. Si no hay
 * check-in ni hoy ni ayer, la racha es 0.
 *
 * @param fechasCheckIn fechas calendario 'YYYY-MM-DD' de los check-ins de la persona en el desafío
 * @param hoy fecha calendario de hoy en la zona de la persona
 * @param ayer fecha calendario de ayer en la zona de la persona
 */
export function calcularRachaActual(
  fechasCheckIn: string[],
  hoy: string,
  ayer: string,
): number {
  const fechas = new Set(fechasCheckIn);

  let fechaActual: string | null = null;
  if (fechas.has(hoy)) {
    fechaActual = hoy;
  } else if (fechas.has(ayer)) {
    fechaActual = ayer;
  } else {
    return 0;
  }

  let racha = 0;
  let fecha = fechaActual;
  while (fecha !== null && fechas.has(fecha)) {
    racha++;
    fecha = sumarDiasFechaCalendario(fecha, -1);
  }
  return racha;
}

/**
 * Calcula la mejor racha (racha más larga de días consecutivos con check-in)
 * de una persona en un desafío, considerando todo el historial.
 *
 * @param fechasCheckIn fechas calendario 'YYYY-MM-DD' de los check-ins de la persona en el desafío
 */
export function calcularMejorRacha(fechasCheckIn: string[]): number {
  const fechas = [...new Set(fechasCheckIn)].sort();
  if (fechas.length === 0) return 0;

  let mejor = 1;
  let actual = 1;
  for (let i = 1; i < fechas.length; i++) {
    const esperado = sumarDiasFechaCalendario(fechas[i - 1], 1);
    if (fechas[i] === esperado) {
      actual++;
      if (actual > mejor) mejor = actual;
    } else {
      actual = 1;
    }
  }
  return mejor;
}

/**
 * Verifica si una persona ya tiene check-in para una fecha dada en un desafío,
 * a partir de un listado de fechas calendario.
 */
export function tieneCheckInEnFecha(
  fechasCheckIn: string[],
  fecha: string,
): boolean {
  return fechasCheckIn.includes(fecha);
}
