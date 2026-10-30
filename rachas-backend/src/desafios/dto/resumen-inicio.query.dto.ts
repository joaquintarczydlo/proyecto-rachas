import { IsMongoId } from 'class-validator';

/**
 * Query para el resumen de inicio de una persona:
 * `GET /desafios/resumen-inicio?personaId=...`
 */
export class ResumenInicioQueryDto {
  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;
}
