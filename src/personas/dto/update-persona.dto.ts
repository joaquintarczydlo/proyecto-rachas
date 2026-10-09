import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { IsValidTimeZoneConstraint } from './create-persona.dto';

export class UpdatePersonaDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser una cadena de texto' })
  @Validate(IsValidTimeZoneConstraint)
  zonaHoraria?: string;
}

