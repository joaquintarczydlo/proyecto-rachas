import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Registro de que una persona cumplió su objetivo en un día de un desafío.
 * La fecha es opcional: si no se indica se registra la de hoy en la zona
 * horaria de la persona (solo se admite hoy o ayer).
 * El proyecto no tiene módulo de autenticación todavía, por eso el id viaja en el cuerpo.
 */
export class CreateCheckInDto {
  @IsMongoId({ message: 'La persona debe ser el id de una persona existente' })
  personaId: string;

  @IsOptional()
  @IsString({ message: 'La fecha debe ser una cadena de texto' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  })
  fecha?: string;

  @IsOptional()
  @IsString({ message: 'La nota debe ser una cadena de texto' })
  @MaxLength(140, { message: 'La nota no puede superar los 140 caracteres' })
  nota?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El valor debe ser un número (minutos, km, páginas…)' })
  @Min(0, { message: 'El valor no puede ser negativo' })
  valor?: number;
}
