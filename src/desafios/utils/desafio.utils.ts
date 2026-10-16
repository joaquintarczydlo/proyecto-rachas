import { randomBytes } from 'crypto';
import { getFechaCalendario } from '../../personas/utils/date.utils';

/** Categorías disponibles para un desafío. */
export const CATEGORIAS_DESAFIO = [
  'SALUD',
  'ESTUDIO',
  'FINANZAS',
  'BIENESTAR',
  'OTRO',
] as const;

export type CategoriaDesafio = (typeof CATEGORIAS_DESAFIO)[number];

/** Estados posibles de un desafío. */
export const ESTADOS_DESAFIO = [
  'PROGRAMADO',
  'ACTIVO',
  'FINALIZADO',
  'CANCELADO',
] as const;

/**
 * PROGRAMADO, ACTIVO y FINALIZADO se calculan a partir de las fechas.
 * CANCELADO es el único estado que se persiste (flag `cancelado`).
 */
export type EstadoDesafio = (typeof ESTADOS_DESAFIO)[number];

export const DURACION_MINIMA_DIAS = 3;
export const DURACION_MAXIMA_DIAS = 90;
export const PARTICIPANTES_MINIMOS = 2;
export const PARTICIPANTES_MAXIMOS = 20;
export const PARTICIPANTES_POR_DEFECTO = 10;
export const LONGITUD_CODIGO_INVITACION = 6;

/** Máximo de desafíos vigentes (PROGRAMADO o ACTIVO) que una persona puede tener a la vez. */
export const LIMITE_DESAFIOS_VIGENTES = 5;

/** Zona usada para calcular "hoy" en las reglas de negocio de desafíos. */
export const ZONA_HORARIA_DESAFIO = 'America/Argentina/Buenos_Aires';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Alfabeto del código de invitación sin caracteres ambiguos (I, O, 0, 1).
 * Tiene 32 caracteres (2^5), por lo que `byte % 32` no introduce sesgo.
 */
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Devuelve la fecha calendario de hoy ('YYYY-MM-DD') en la zona de referencia de los desafíos.
 */
export function getHoyDesafio(date: Date = new Date()): string {
  return getFechaCalendario(ZONA_HORARIA_DESAFIO, date);
}

/**
 * Valida que un string sea una fecha de calendario real en formato 'YYYY-MM-DD'
 * (rechaza cosas como '2026-02-30' o '2026-13-01').
 */
export function esFechaValida(fecha: string): boolean {
  if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha)) {
    return false;
  }
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const date = new Date(anio, mes - 1, dia);
  return (
    date.getFullYear() === anio &&
    date.getMonth() === mes - 1 &&
    date.getDate() === dia
  );
}

/**
 * Convierte una fecha calendario 'YYYY-MM-DD' a un objeto Date local (sin UTC).
 */
export function parseFechaCalendario(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/**
 * Suma (o resta) días a una fecha calendario devolviendo 'YYYY-MM-DD'.
 */
export function sumarDiasFechaCalendario(fecha: string, dias: number): string {
  const date = parseFechaCalendario(fecha);
  date.setDate(date.getDate() + dias);
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}

/**
 * Cantidad de días de un desafío contando el día de inicio y el de fin
 * (una duración de 3 a 90 días inclusive).
 */
export function diasIncluidosEntreFechas(
  fechaInicio: string,
  fechaFin: string,
): number {
  const msPorDia = 24 * 60 * 60 * 1000;
  const inicio = parseFechaCalendario(fechaInicio).getTime();
  const fin = parseFechaCalendario(fechaFin).getTime();
  // Math.round absorbe los saltos de horario de verano (días de 23 o 25 horas).
  return Math.round((fin - inicio) / msPorDia) + 1;
}

/**
 * Valida el par de fechas de un desafío (formato, orden, inicio no pasado y duración).
 * Devuelve el mensaje de error o `null` si todo está bien.
 */
export function validarRangoFechas(
  fechaInicio: string,
  fechaFin: string,
  hoy: string,
): string | null {
  if (!esFechaValida(fechaInicio)) {
    return `La fecha de inicio ('${fechaInicio}') no es una fecha válida (formato YYYY-MM-DD)`;
  }
  if (!esFechaValida(fechaFin)) {
    return `La fecha de fin ('${fechaFin}') no es una fecha válida (formato YYYY-MM-DD)`;
  }
  if (fechaInicio < hoy) {
    return `La fecha de inicio ('${fechaInicio}') no puede ser anterior a hoy ('${hoy}')`;
  }
  if (fechaFin < fechaInicio) {
    return `La fecha de fin ('${fechaFin}') no puede ser anterior a la fecha de inicio ('${fechaInicio}')`;
  }
  const dias = diasIncluidosEntreFechas(fechaInicio, fechaFin);
  if (dias < DURACION_MINIMA_DIAS || dias > DURACION_MAXIMA_DIAS) {
    return `El desafío debe durar entre ${DURACION_MINIMA_DIAS} y ${DURACION_MAXIMA_DIAS} días incluyendo el inicio y el fin (duración actual: ${dias} día(s))`;
  }
  return null;
}

/**
 * Calcula el estado efectivo de un desafío a partir de su flag `cancelado` y las fechas.
 * - CANCELADO: si el creador lo canceló (único estado persistido).
 * - PROGRAMADO: hoy es anterior al día de inicio.
 * - FINALIZADO: hoy ya pasó el día de fin.
 * - ACTIVO: hoy está dentro del rango [fechaInicio, fechaFin] inclusive.
 */
export function calcularEstadoDesafio(
  desafio: { fechaInicio: string; fechaFin: string; cancelado?: boolean },
  hoy: string = getHoyDesafio(),
): EstadoDesafio {
  if (desafio.cancelado) {
    return 'CANCELADO';
  }
  if (hoy < desafio.fechaInicio) {
    return 'PROGRAMADO';
  }
  if (hoy > desafio.fechaFin) {
    return 'FINALIZADO';
  }
  return 'ACTIVO';
}

/**
 * Genera un código de invitación aleatorio de 6 caracteres (por defecto)
 * con letras y dígitos sin caracteres ambiguos.
 */
export function generarCodigoInvitacion(
  longitud: number = LONGITUD_CODIGO_INVITACION,
): string {
  const bytes = randomBytes(longitud);
  let codigo = '';
  for (let i = 0; i < longitud; i++) {
    codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
  }
  return codigo;
}

/**
 * Traduce un estado a un filtro de MongoDB equivalente a `calcularEstadoDesafio`.
 * Es necesario porque el estado no se persiste: así se puede filtrar en la base
 * (las comparaciones lexicográficas de 'YYYY-MM-DD' equivale a las cronológicas).
 *
 * - CANCELADO:     cancelado === true
 * - PROGRAMADO:    !cancelado && fechaInicio >  hoy
 * - ACTIVO:        !cancelado && fechaInicio <= hoy && fechaFin >= hoy
 * - FINALIZADO:    !cancelado && fechaFin <  hoy
 */
export function construirFiltroEstado(
  estado: EstadoDesafio,
  hoy: string = getHoyDesafio(),
): Record<string, unknown> {
  switch (estado) {
    case 'CANCELADO':
      return { cancelado: true };
    case 'PROGRAMADO':
      return { cancelado: { $ne: true }, fechaInicio: { $gt: hoy } };
    case 'ACTIVO':
      return {
        cancelado: { $ne: true },
        fechaInicio: { $lte: hoy },
        fechaFin: { $gte: hoy },
      };
    case 'FINALIZADO':
      return { cancelado: { $ne: true }, fechaFin: { $lt: hoy } };
  }
}

/**
 * Filtro de MongoDB para los desafíos vigentes (PROGRAMADO o ACTIVO) en los
 * que participa una persona. Dado el invariante fechaFin >= fechaInicio,
 * la unión PROGRAMADO ∪ ACTIVO equivale a !cancelado && fechaFin >= hoy.
 */
export function filtroDesafiosVigentesDePersona(
  personaId: string,
  hoy: string = getHoyDesafio(),
): Record<string, unknown> {
  return {
    participantes: personaId,
    cancelado: { $ne: true },
    fechaFin: { $gte: hoy },
  };
}
