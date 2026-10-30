import type { EstadoDesafio } from '../utils/desafio.utils';

/**
 * Un ítem del ranking de un desafío.
 * El ranking solo incluye a quienes participan actualmente (no abandonados).
 */
export interface RankingItem {
  /** Posición en el ranking (1 = primero). */
  posicion: number;
  personaId: string;
  alias: string;
  nombre: string;
  /** Suma de los puntos de todos sus check-ins en el desafío. */
  puntosTotales: number;
  /** Racha actual calculada al momento de la consulta. */
  rachaActual: number;
  /** Cantidad de check-ins registrados en el desafío. */
  checkIns: number;
}

/**
 * Resultado de consulta de racha de una persona en un desafío.
 */
export interface RachaPersonaResponse {
  personaId: string;
  desafioId: string;
  rachaActual: number;
  mejorRacha: number;
}

/**
 * Un ítem del resumen de inicio de una persona.
 */
export interface ResumenInicioItem {
  desafioId: string;
  nombre: string;
  estado: EstadoDesafio;
  /** Racha actual de la persona en este desafío. */
  rachaActual: number;
  /** Posición de la persona en el ranking de este desafío. */
  posicion: number;
  /** Si la persona ya registró el check-in de hoy (en su zona horaria). */
  checkInHoy: boolean;
}

/**
 * Respuesta paginada genérica.
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
