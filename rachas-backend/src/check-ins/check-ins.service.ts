import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { DesafiosService } from '../desafios/desafios.service';
import {
  calcularEstadoDesafio,
  esFechaValida,
  sumarDiasFechaCalendario,
} from '../desafios/utils/desafio.utils';
import { PersonasService } from '../personas/personas.service';
import {
  getFechaCalendario,
  isValidTimeZone,
} from '../personas/utils/date.utils';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { DeshacerCheckInDto } from './dto/deshacer-check-in.dto';
import { CheckIn, CheckInDocument } from './schemas/check-in.schema';

/** Zona usada como respaldo si la persona tiene una zona horaria inválida. */
const ZONA_HORARIA_RESPALDO = 'America/Argentina/Buenos_Aires';

@Injectable()
export class CheckInsService {
  constructor(
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    private readonly desafiosService: DesafiosService,
    private readonly personasService: PersonasService,
  ) {}

  /**
   * Registra un check-in de una persona en un desafío.
   * Reglas: solo participantes, solo en desafíos ACTIVO, la fecha debe ser
   * la de hoy o la de ayer en la zona horaria de la persona (nunca futura
   * ni anterior a ayer) y debe caer dentro del rango del desafío.
   * Un único check-in por persona, desafío y día.
   */
  async registrar(
    desafioId: string,
    createCheckInDto: CreateCheckInDto,
  ): Promise<CheckInDocument> {
    const desafio = await this.desafiosService.findOne(desafioId);

    const estado = calcularEstadoDesafio(desafio);
    if (estado !== 'ACTIVO') {
      throw new ConflictException(
        `Solo se pueden registrar check-ins en un desafío ACTIVO (estado actual: ${estado})`,
      );
    }

    const persona = await this.personasService.findOne(
      createCheckInDto.personaId,
    );
    const esParticipante = desafio.participantes.some(
      (p) => p.toString() === persona._id.toString(),
    );
    if (!esParticipante) {
      throw new ForbiddenException(
        'Solo los participantes del desafío pueden registrar check-ins',
      );
    }

    // "Hoy" y "ayer" en la zona horaria de la persona, no en la del servidor.
    const hoy = getFechaCalendario(this.zonaDePersona(persona));
    const ayer = sumarDiasFechaCalendario(hoy, -1);
    const fecha = createCheckInDto.fecha ?? hoy;

    if (!esFechaValida(fecha)) {
      throw new BadRequestException(
        `La fecha ('${fecha}') no es una fecha válida (formato YYYY-MM-DD)`,
      );
    }
    if (fecha !== hoy && fecha !== ayer) {
      throw new BadRequestException(
        `La fecha del check-in debe ser la de hoy ('${hoy}') o la de ayer ('${ayer}') en la zona horaria de la persona; no se admiten fechas futuras ni anteriores a ayer`,
      );
    }
    if (fecha < desafio.fechaInicio || fecha > desafio.fechaFin) {
      throw new BadRequestException(
        `La fecha del check-in ('${fecha}') debe estar dentro del rango del desafío (${desafio.fechaInicio} a ${desafio.fechaFin})`,
      );
    }

    const existente = await this.checkInModel
      .findOne({
        desafio: desafio._id,
        persona: persona._id,
        fecha,
      })
      .exec();
    if (existente) {
      throw new ConflictException(
        `Ya existe un check-in de ${persona.nombre} para el día ${fecha}`,
      );
    }

    try {
      const checkIn = new this.checkInModel({
        desafio: desafio._id,
        persona: persona._id,
        fecha,
        nota: createCheckInDto.nota?.trim(),
        valor: createCheckInDto.valor,
      });
      return await checkIn.save();
    } catch (error: any) {
      // 11000 = clave duplicada (carrera entre el chequeo y el guardado).
      if (error?.code === 11000) {
        throw new ConflictException(
          `Ya existe un check-in de la persona para el día ${fecha}`,
        );
      }
      throw error;
    }
  }

  /** Zona horaria de la persona, con respaldo si fuera inválida. */
  private zonaDePersona(persona: { zonaHoraria?: string }): string {
    const zona = persona.zonaHoraria;
    return zona && isValidTimeZone(zona) ? zona : ZONA_HORARIA_RESPALDO;
  }

  /**
   * Deshace el último check-in propio de una persona en un desafío,
   * solo si ese check-in es de hoy (en su zona horaria).
   * No requiere que el desafío siga ACTIVO: la única condición es "último y de hoy".
   */
  async deshacer(
    desafioId: string,
    deshacerCheckInDto: DeshacerCheckInDto,
  ): Promise<CheckInDocument> {
    const desafio = await this.desafiosService.findOne(desafioId);
    const persona = await this.personasService.findOne(
      deshacerCheckInDto.personaId,
    );

    const ultimo = await this.checkInModel
      .findOne({ desafio: desafio._id, persona: persona._id })
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    if (!ultimo) {
      throw new NotFoundException(
        'La persona no tiene check-ins en este desafío',
      );
    }

    const hoy = getFechaCalendario(this.zonaDePersona(persona));
    if (ultimo.fecha !== hoy) {
      throw new ConflictException(
        `Solo se puede deshacer el check-in de hoy ('${hoy}'); el último check-in registrado es del '${ultimo.fecha}'`,
      );
    }

    await this.checkInModel.deleteOne({ _id: ultimo._id }).exec();
    return ultimo;
  }

  /**
   * Lista los check-ins de una persona en un desafío, ordenados por fecha.
   */
  async findByPersona(
    desafioId: string,
    personaId: string,
  ): Promise<CheckInDocument[]> {
    const desafio = await this.desafiosService.findOne(desafioId);
    const persona = await this.personasService.findOne(personaId);

    return this.checkInModel
      .find({ desafio: desafio._id, persona: persona._id })
      .sort({ fecha: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Consulta un check-in por su ID de MongoDB.
   */
  async findOne(id: string): Promise<CheckInDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`El formato del id '${id}' no es válido`);
    }

    const checkIn = await this.checkInModel.findById(id).exec();
    if (!checkIn) {
      throw new NotFoundException(
        `No se encontró ningún check-in con el id '${id}'`,
      );
    }

    return checkIn;
  }
}
