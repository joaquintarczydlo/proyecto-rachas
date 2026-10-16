import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CATEGORIAS_DESAFIO,
  PARTICIPANTES_MAXIMOS,
  PARTICIPANTES_MINIMOS,
} from '../utils/desafio.utils';
import type { CategoriaDesafio } from '../utils/desafio.utils';

export class CreateDesafioDto {
  /** Id de la persona que crea el desafío; queda como creador y participante. */
  @IsMongoId({ message: 'El creador debe ser el id de una persona existente' })
  creadorId: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(3, 60, { message: 'El nombre debe tener entre 3 y 60 caracteres' })
  nombre: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(280, {
    message: 'La descripción no puede superar los 280 caracteres',
  })
  descripcion?: string;

  @IsIn(CATEGORIAS_DESAFIO, {
    message: 'La categoría debe ser SALUD, ESTUDIO, FINANZAS, BIENESTAR u OTRO',
  })
  categoria: CategoriaDesafio;

  @IsString({ message: 'La fecha de inicio debe ser una cadena de texto' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de inicio debe tener formato YYYY-MM-DD',
  })
  fechaInicio: string;

  @IsString({ message: 'La fecha de fin debe ser una cadena de texto' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de fin debe tener formato YYYY-MM-DD',
  })
  fechaFin: string;

  @IsOptional()
  @IsInt({ message: 'El máximo de participantes debe ser un número entero' })
  @Min(PARTICIPANTES_MINIMOS, {
    message: 'El máximo de participantes debe ser al menos 2',
  })
  @Max(PARTICIPANTES_MAXIMOS, {
    message: 'El máximo de participantes no puede superar los 20',
  })
  maxParticipantes?: number;
}
