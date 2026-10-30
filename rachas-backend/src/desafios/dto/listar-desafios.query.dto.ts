import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CATEGORIAS_DESAFIO, ESTADOS_DESAFIO } from '../utils/desafio.utils';
import type { CategoriaDesafio, EstadoDesafio } from '../utils/desafio.utils';

/**
 * Filtros y paginación para el listado de desafíos:
 * `GET /desafios?estado=ACTIVO&categoria=SALUD&page=...&limit=...`
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

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser al menos 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(100, { message: 'El límite no puede superar los 100' })
  limit?: number;
}
