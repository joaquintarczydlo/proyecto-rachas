import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Persona, PersonaDocument } from './schemas/persona.schema';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { getFechaCalendario } from './utils/date.utils';

@Injectable()
export class PersonasService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Persona.name)
    private readonly personaModel: Model<PersonaDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedPersonas();
  }

  /**
   * Precarga datos de prueba si no existen en la base de datos (mínimo 3 personas).
   * Es idempotente para no duplicar datos si el servidor se reinicia.
   */
  private async seedPersonas(): Promise<void> {
    const personasPrueba = [
      {
        nombre: 'Lucía Pérez',
        alias: 'lucia_p',
        email: 'lucia@ejemplo.com',
        zonaHoraria: 'America/Argentina/Buenos_Aires',
      },
      {
        nombre: 'Martín Gómez',
        alias: 'martin_g',
        email: 'martin@ejemplo.com',
        zonaHoraria: 'America/Argentina/Buenos_Aires',
      },
      {
        nombre: 'Sofía Rodríguez',
        alias: 'sofia_r',
        email: 'sofia@ejemplo.com',
        zonaHoraria: 'America/Montevideo',
      },
    ];

    for (const p of personasPrueba) {
      const fechaCalendario = getFechaCalendario(p.zonaHoraria);
      await this.personaModel.updateOne(
        { $or: [{ email: p.email }, { alias: p.alias }] },
        {
          $setOnInsert: {
            ...p,
            fechaCalendario,
          },
        },
        { upsert: true },
      );
    }
  }

  /**
   * Crea una nueva persona registrando su fecha calendario según su zona horaria (sin UTC).
   */
  async create(createPersonaDto: CreatePersonaDto): Promise<PersonaDocument> {
    const aliasNormalized = createPersonaDto.alias.trim();
    const emailNormalized = createPersonaDto.email.trim().toLowerCase();

    // 1. Verificación de reglas de unicidad locales
    const existingAlias = await this.personaModel.findOne({ alias: aliasNormalized }).exec();
    if (existingAlias) {
      throw new ConflictException(`El alias '${aliasNormalized}' ya se encuentra registrado`);
    }

    const existingEmail = await this.personaModel.findOne({ email: emailNormalized }).exec();
    if (existingEmail) {
      throw new ConflictException(`El email '${emailNormalized}' ya se encuentra registrado`);
    }

    const zonaHoraria = createPersonaDto.zonaHoraria?.trim() || 'America/Argentina/Buenos_Aires';
    const fechaCalendario = getFechaCalendario(zonaHoraria);

    try {
      const persona = new this.personaModel({
        nombre: createPersonaDto.nombre.trim(),
        alias: aliasNormalized,
        email: emailNormalized,
        zonaHoraria,
        fechaCalendario,
      });

      return await persona.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('Ya existe una persona con ese alias o email');
      }
      throw error;
    }
  }

  /**
   * Retorna todas las personas registradas.
   */
  async findAll(): Promise<PersonaDocument[]> {
    return this.personaModel.find().exec();
  }

  /**
   * Consulta una persona por su ID de MongoDB.
   */
  async findOne(id: string): Promise<PersonaDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`El formato del id '${id}' no es válido`);
    }

    const persona = await this.personaModel.findById(id).exec();
    if (!persona) {
      throw new NotFoundException(`No se encontró ninguna persona con el id '${id}'`);
    }

    return persona;
  }

  /**
   * Modifica los datos de una persona (nombre y/o zona horaria).
   * Si cambia la zona horaria, se recalcula la fecha calendario en esa zona.
   */
  async update(id: string, updatePersonaDto: UpdatePersonaDto): Promise<PersonaDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`El formato del id '${id}' no es válido`);
    }

    const persona = await this.personaModel.findById(id).exec();
    if (!persona) {
      throw new NotFoundException(`No se encontró ninguna persona con el id '${id}'`);
    }

    if (updatePersonaDto.nombre !== undefined) {
      persona.nombre = updatePersonaDto.nombre.trim();
    }

    if (updatePersonaDto.zonaHoraria !== undefined) {
      const nuevaZona = updatePersonaDto.zonaHoraria.trim();
      persona.zonaHoraria = nuevaZona;
      persona.fechaCalendario = getFechaCalendario(nuevaZona);
    }

    return await persona.save();
  }

  /**
   * Elimina una persona por su ID.
   */
  async remove(id: string): Promise<PersonaDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`El formato del id '${id}' no es válido`);
    }

    const persona = await this.personaModel.findByIdAndDelete(id).exec();
    if (!persona) {
      throw new NotFoundException(`No se encontró ninguna persona con el id '${id}'`);
    }

    return persona;
  }
}
