import { IsMongoId } from 'class-validator';

/**
 * Una persona (que no sea el creador) puede abandonar un desafío.
 * El creador, en cambio, debe cancelarlo.
 * El proyecto no tiene módulo de autenticación todavía, por eso el id viaja en el cuerpo.
 */
export class AbandonarDesafioDto {
  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;
}
