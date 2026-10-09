/**
 * Valida si un string corresponde a un identificador IANA de zona horaria válido.
 * Ejemplo válido: 'America/Argentina/Buenos_Aires', 'UTC', 'Europe/Madrid'.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene la fecha calendario en formato 'YYYY-MM-DD' calculada en la zona horaria de la persona.
 * Se evita el uso de marcas de tiempo UTC con hora para prevenir ambigüedades de desfasaje de días.
 */
export function getFechaCalendario(
  timeZone: string = 'America/Argentina/Buenos_Aires',
  date: Date = new Date(),
): string {
  if (!isValidTimeZone(timeZone)) {
    throw new Error(`Zona horaria inválida: ${timeZone}`);
  }

  // 'en-CA' produce estándar ISO de fecha calendario: YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

