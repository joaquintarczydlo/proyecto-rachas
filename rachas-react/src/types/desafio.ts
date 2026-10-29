export type CategoriaDesafio =
  | 'SALUD'
  | 'ESTUDIO'
  | 'FINANZAS'
  | 'BIENESTAR'
  | 'OTRO';

export type EstadoDesafio =
  | 'PROGRAMADO'
  | 'ACTIVO'
  | 'FINALIZADO'
  | 'CANCELADO';

export interface Desafio {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: CategoriaDesafio;
  fechaInicio: string;
  fechaFin: string;
  maxParticipantes: number;
  codigoInvitacion: string;
  creador: string;
  participantes: string[];
  abandonados: string[];
  cancelado: boolean;
  estado: EstadoDesafio;
  createdAt?: string;
  updatedAt?: string;
}
