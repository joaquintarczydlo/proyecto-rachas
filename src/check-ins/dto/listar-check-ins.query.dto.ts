import { IsMongoId } from 'class-validator';

/**
 * Filtro para listar los check-ins de una persona en un desafío:
 * `GET /desafios/:desafioId/check-ins?personaId=...`
 */
export class ListarCheckInsQueryDto {
  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;
}
