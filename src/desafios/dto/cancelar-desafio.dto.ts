import { IsMongoId } from 'class-validator';

/**
 * Solo el creador del desafío puede cancelarlo.
 * El proyecto no tiene módulo de autenticación todavía, por eso el id viaja en el cuerpo.
 */
export class CancelarDesafioDto {
  @IsMongoId({ message: 'El creador debe ser el id de una persona existente' })
  creadorId: string;
}
