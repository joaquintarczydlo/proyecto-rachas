import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Filtro y paginación para listar los check-ins de una persona en un desafío:
 * `GET /desafios/:desafioId/check-ins?personaId=...&page=...&limit=...`
 */
export class ListarCheckInsQueryDto {
  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;

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
