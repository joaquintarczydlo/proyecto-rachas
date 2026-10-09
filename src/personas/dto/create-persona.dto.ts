import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidTimeZone } from '../utils/date.utils';

@ValidatorConstraint({ name: 'isValidTimeZone', async: false })
export class IsValidTimeZoneConstraint implements ValidatorConstraintInterface {
  validate(timeZone: string): boolean {
    return isValidTimeZone(timeZone);
  }

  defaultMessage(args: ValidationArguments): string {
    return `La propiedad ${args.property} ('${args.value}') debe ser una zona horaria IANA válida (ejemplo: 'America/Argentina/Buenos_Aires')`;
  }
}

export class CreatePersonaDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre: string;

  @IsString({ message: 'El alias debe ser una cadena de texto' })
  @Length(3, 20, { message: 'El alias debe tener entre 3 y 20 caracteres' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El alias solo puede contener letras, números y guion bajo',
  })
  alias: string;

  @IsEmail({}, { message: 'El email debe tener un formato de correo electrónico válido' })
  email: string;

  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser una cadena de texto' })
  @Validate(IsValidTimeZoneConstraint)
  zonaHoraria?: string;
}

