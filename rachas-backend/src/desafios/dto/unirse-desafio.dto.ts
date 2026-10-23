import { IsMongoId, IsString, Matches } from 'class-validator';

/**
 * Una persona se une a un desafío con su código de invitación.
 * El proyecto no tiene módulo de autenticación todavía, por eso el id viaja en el cuerpo.
 */
export class UnirseDesafioDto {
  @IsString({ message: 'El código de invitación debe ser una cadena de texto' })
  @Matches(/^[A-Za-z0-9]{6}$/, {
    message: 'El código de invitación debe tener 6 caracteres (letras y números)',
  })
  codigo: string;

  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;
}
