import { IsIn, IsOptional } from 'class-validator';
import { CATEGORIAS_DESAFIO, ESTADOS_DESAFIO } from '../utils/desafio.utils';
import type { CategoriaDesafio, EstadoDesafio } from '../utils/desafio.utils';

/**
 * Filtros opcionales para el listado de desafíos:
 * `GET /desafios?estado=ACTIVO&categoria=SALUD`
 */
export class ListarDesafiosQueryDto {
  @IsOptional()
  @IsIn(ESTADOS_DESAFIO, {
    message: 'El estado debe ser PROGRAMADO, ACTIVO, FINALIZADO o CANCELADO',
  })
  estado?: EstadoDesafio;

  @IsOptional()
  @IsIn(CATEGORIAS_DESAFIO, {
    message: 'La categoría debe ser SALUD, ESTUDIO, FINANZAS, BIENESTAR u OTRO',
  })
  categoria?: CategoriaDesafio;
}
