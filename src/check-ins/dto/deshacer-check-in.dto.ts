import { IsMongoId } from 'class-validator';

/**
 * Deshacer el último check-in propio de un desafío (solo si es de hoy).
 * El proyecto no tiene módulo de autenticación todavía, por eso el id viaja en el cuerpo.
 */
export class DeshacerCheckInDto {
  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;
}
