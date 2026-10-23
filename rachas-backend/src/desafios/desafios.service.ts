import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { PersonasService } from '../personas/personas.service';
import { AbandonarDesafioDto } from './dto/abandonar-desafio.dto';
import { CancelarDesafioDto } from './dto/cancelar-desafio.dto';
import { CreateDesafioDto } from './dto/create-desafio.dto';
import { ListarDesafiosQueryDto } from './dto/listar-desafios.query.dto';
import { UnirseDesafioDto } from './dto/unirse-desafio.dto';
import { UpdateDesafioDto } from './dto/update-desafio.dto';
import { Desafio, DesafioDocument } from './schemas/desafio.schema';
import {
  LIMITE_DESAFIOS_VIGENTES,
  PARTICIPANTES_POR_DEFECTO,
  calcularEstadoDesafio,
  construirFiltroEstado,
  filtroDesafiosVigentesDePersona,
  generarCodigoInvitacion,
  getHoyDesafio,
  validarRangoFechas,
} from './utils/desafio.utils';

/** Cantidad de códigos de invitación a intentar antes de rendirse ante colisiones. */
const MAX_INTENTOS_CODIGO = 5;

@Injectable()
export class DesafiosService {
  constructor(
    @InjectModel(Desafio.name)
    private readonly desafioModel: Model<DesafioDocument>,
    private readonly personasService: PersonasService,
  ) {}

  /**
   * Crea un desafío generando en el servidor un código de invitación único
   * y registrando al creador como creador y participante automáticamente.
   */
  async create(createDesafioDto: CreateDesafioDto): Promise<DesafioDocument> {
    const nombre = createDesafioDto.nombre.trim();
    if (nombre.length < 3 || nombre.length > 60) {
      throw new BadRequestException(
        'El nombre debe tener entre 3 y 60 caracteres',
      );
    }

    // Valida que el creador exista (también valida el formato del ObjectId).
    const creador = await this.personasService.findOne(createDesafioDto.creadorId);

    const hoy = getHoyDesafio();
    const errorFechas = validarRangoFechas(
      createDesafioDto.fechaInicio,
      createDesafioDto.fechaFin,
      hoy,
    );
    if (errorFechas) {
      throw new BadRequestException(errorFechas);
    }

    return this.guardarConCodigoUnico({
      nombre,
      descripcion: createDesafioDto.descripcion?.trim(),
      categoria: createDesafioDto.categoria,
      fechaInicio: createDesafioDto.fechaInicio,
      fechaFin: createDesafioDto.fechaFin,
      maxParticipantes:
        createDesafioDto.maxParticipantes ?? PARTICIPANTES_POR_DEFECTO,
      creador: creador._id,
      participantes: [creador._id],
      cancelado: false,
    });
  }

  /**
   * Guarda un nuevo desafío generando un código de invitación único.
   * Ante una colisión (índice único en MongoDB) reintenta con otro código.
   */
  private async guardarConCodigoUnico(
    datos: Partial<Desafio>,
  ): Promise<DesafioDocument> {
    for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
      const codigoInvitacion = generarCodigoInvitacion();

      const codigoRepetido = await this.desafioModel
        .findOne({ codigoInvitacion })
        .exec();
      if (codigoRepetido) {
        continue;
      }

      try {
        return await new this.desafioModel({
          ...datos,
          codigoInvitacion,
        }).save();
      } catch (error: any) {
        // 11000 = clave duplicada (carrera entre el chequeo y el guardado).
        if (error?.code !== 11000) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      `No se pudo generar un código de invitación único tras ${MAX_INTENTOS_CODIGO} intentos, intente nuevamente`,
    );
  }

  /**
   * Retorna los desafíos, opcionalmente filtrados por estado y categoría.
   * Como el estado se calcula, se traduce a criterios de fechas en la consulta.
   */
  async findAll(filtro?: ListarDesafiosQueryDto): Promise<DesafioDocument[]> {
    const filtroMongo: Record<string, unknown> = {};

    if (filtro?.estado) {
      Object.assign(filtroMongo, construirFiltroEstado(filtro.estado));
    }
    if (filtro?.categoria) {
      filtroMongo.categoria = filtro.categoria;
    }

    return this.desafioModel.find(filtroMongo).exec();
  }

  /**
   * Retorna los desafíos en los que una persona participa actualmente
   * (los creados por ella cuentan, ya que el creador figura en `participantes`;
   * los abandonados quedan solo en el historial y no aparecen).
   */
  async findByPersona(personaId: string): Promise<DesafioDocument[]> {
    // Valida que la persona exista (también valida el formato del ObjectId).
    await this.personasService.findOne(personaId);

    return this.desafioModel.find({ participantes: personaId }).exec();
  }

  /**
   * Consulta los participantes actuales de un desafío (con los datos de cada persona).
   */
  async findParticipantes(id: string): Promise<DesafioDocument['participantes']> {
    const desafio = await this.desafioModel
      .findById(id)
      .populate('participantes')
      .exec();
    if (!desafio) {
      throw new NotFoundException(
        `No se encontró ningún desafío con el id '${id}'`,
      );
    }

    return desafio.participantes;
  }

  /**
   * Consulta un desafío por su ID de MongoDB.
   */
  async findOne(id: string): Promise<DesafioDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`El formato del id '${id}' no es válido`);
    }

    const desafio = await this.desafioModel.findById(id).exec();
    if (!desafio) {
      throw new NotFoundException(
        `No se encontró ningún desafío con el id '${id}'`,
      );
    }

    return desafio;
  }

  /**
   * Consulta un desafío por su código de invitación (6 caracteres).
   */
  async findByCodigo(codigo: string): Promise<DesafioDocument> {
    const codigoNormalizado = codigo?.trim().toUpperCase() ?? '';
    if (!/^[A-Z0-9]{6}$/.test(codigoNormalizado)) {
      throw new BadRequestException(
        `El formato del código de invitación '${codigo}' no es válido (debe tener 6 caracteres)`,
      );
    }

    const desafio = await this.desafioModel
      .findOne({ codigoInvitacion: codigoNormalizado })
      .exec();
    if (!desafio) {
      throw new NotFoundException(
        `No se encontró ningún desafío con el código '${codigoNormalizado}'`,
      );
    }

    return desafio;
  }

  /**
   * Modifica un desafío. Solo puede hacerlo el creador.
   * - nombre / descripcion / categoria: mientras no esté FINALIZADO ni CANCELADO.
   * - fechaInicio / fechaFin / maxParticipantes: solo mientras esté PROGRAMADO,
   *   y el máximo nunca puede quedar por debajo de los participantes actuales.
   */
  async update(
    id: string,
    updateDesafioDto: UpdateDesafioDto,
  ): Promise<DesafioDocument> {
    const desafio = await this.findOne(id);
    const hoy = getHoyDesafio();

    this.verificarCreador(desafio, updateDesafioDto.creadorId);

    const estado = calcularEstadoDesafio(desafio, hoy);
    if (estado === 'FINALIZADO' || estado === 'CANCELADO') {
      throw new ConflictException(
        `Un desafío ${estado.toLowerCase()} no admite ninguna operación`,
      );
    }

    const modificaFechas =
      updateDesafioDto.fechaInicio !== undefined ||
      updateDesafioDto.fechaFin !== undefined;
    const modificaMaximo = updateDesafioDto.maxParticipantes !== undefined;

    if ((modificaFechas || modificaMaximo) && estado !== 'PROGRAMADO') {
      throw new ConflictException(
        'Solo se pueden modificar las fechas y el máximo de participantes mientras el desafío esté PROGRAMADO',
      );
    }

    const nombre = updateDesafioDto.nombre?.trim() ?? desafio.nombre;
    if (nombre.length < 3 || nombre.length > 60) {
      throw new BadRequestException(
        'El nombre debe tener entre 3 y 60 caracteres',
      );
    }

    if (modificaFechas) {
      const fechaInicio = updateDesafioDto.fechaInicio ?? desafio.fechaInicio;
      const fechaFin = updateDesafioDto.fechaFin ?? desafio.fechaFin;
      const errorFechas = validarRangoFechas(fechaInicio, fechaFin, hoy);
      if (errorFechas) {
        throw new BadRequestException(errorFechas);
      }
      desafio.fechaInicio = fechaInicio;
      desafio.fechaFin = fechaFin;
    }

    if (
      updateDesafioDto.maxParticipantes !== undefined &&
      updateDesafioDto.maxParticipantes < desafio.participantes.length
    ) {
      throw new ConflictException(
        `El máximo de participantes (${updateDesafioDto.maxParticipantes}) no puede quedar por debajo de los participantes actuales (${desafio.participantes.length})`,
      );
    }

    desafio.nombre = nombre;
    if (updateDesafioDto.descripcion !== undefined) {
      desafio.descripcion = updateDesafioDto.descripcion?.trim();
    }
    if (updateDesafioDto.categoria !== undefined) {
      desafio.categoria = updateDesafioDto.categoria;
    }
    if (updateDesafioDto.maxParticipantes !== undefined) {
      desafio.maxParticipantes = updateDesafioDto.maxParticipantes;
    }

    return await desafio.save();
  }

  /**
   * Cancela un desafío PROGRAMADO o ACTIVO. Solo puede hacerlo el creador.
   * Un desafío FINALIZADO o CANCELADO no admite ninguna otra operación.
   */
  async cancelar(
    id: string,
    cancelarDesafioDto: CancelarDesafioDto,
  ): Promise<DesafioDocument> {
    const desafio = await this.findOne(id);

    this.verificarCreador(desafio, cancelarDesafioDto.creadorId);

    const estado = calcularEstadoDesafio(desafio, getHoyDesafio());
    if (estado === 'FINALIZADO' || estado === 'CANCELADO') {
      throw new ConflictException(
        `Un desafío ${estado.toLowerCase()} no admite ninguna operación`,
      );
    }

    desafio.cancelado = true;
    return await desafio.save();
  }

  /**
   * Une una persona a un desafío usando su código de invitación.
   * Reglas: el desafío debe estar PROGRAMADO o ACTIVO y tener cupo;
   * la persona no puede estar ya participando ni haberlo abandonado;
   * y no puede superar el máximo de desafíos vigentes (los creados cuentan).
   */
  async unirse(unirseDesafioDto: UnirseDesafioDto): Promise<DesafioDocument> {
    const codigo = unirseDesafioDto.codigo.trim().toUpperCase();
    const desafio = await this.desafioModel.findOne({ codigoInvitacion: codigo }).exec();
    
    if (!desafio) {
      throw new NotFoundException(
        `No se encontró ningún desafío con el código '${codigo}'`,
      );
    }

    const persona = await this.personasService.findOne(
      unirseDesafioDto.personaId,
    );

    const hoy = getHoyDesafio();
    const estado = calcularEstadoDesafio(desafio, hoy);
    if (estado !== 'PROGRAMADO' && estado !== 'ACTIVO') {
      throw new ConflictException(
        `No se puede unir a un desafío ${estado.toLowerCase()}`,
      );
    }

    if (
      desafio.participantes.some(
        (p) => p.toString() === persona._id.toString(),
      )
    ) {
      throw new ConflictException('La persona ya participa de este desafío');
    }

    if (
      desafio.abandonados?.some(
        (p) => p.toString() === persona._id.toString(),
      )
    ) {
      throw new ConflictException(
        'La persona abandonó este desafío y no puede volver a unirse',
      );
    }

    if (desafio.participantes.length >= desafio.maxParticipantes) {
      throw new ConflictException(
        `El desafío no tiene cupos disponibles (máximo ${desafio.maxParticipantes} participantes)`,
      );
    }

    const vigentes = await this.desafioModel
      .countDocuments(filtroDesafiosVigentesDePersona(persona._id.toString(), hoy))
      .exec();
    if (vigentes >= LIMITE_DESAFIOS_VIGENTES) {
      throw new ConflictException(
        `Una persona no puede tener más de ${LIMITE_DESAFIOS_VIGENTES} desafíos vigentes al mismo tiempo`,
      );
    }

    desafio.participantes.push(persona._id);
    return await desafio.save();
  }

  /**
   * Abandona un desafío: la persona deja de figurar en `participantes`
   * pero queda registrada en el historial `abandonados`, por lo que
   * no puede volver a unirse. El creador no puede abandonar: debe cancelarlo.
   */
  async abandonar(
    id: string,
    abandonarDesafioDto: AbandonarDesafioDto,
  ): Promise<DesafioDocument> {
    const desafio = await this.findOne(id);
    const persona = await this.personasService.findOne(
      abandonarDesafioDto.personaId,
    );
    const personaId = persona._id.toString();

    if (desafio.creador.toString() === personaId) {
      throw new ForbiddenException(
        'El creador no puede abandonar el desafío; debe cancelarlo',
      );
    }

    const estado = calcularEstadoDesafio(desafio, getHoyDesafio());
    if (estado === 'FINALIZADO' || estado === 'CANCELADO') {
      throw new ConflictException(
        `Un desafío ${estado.toLowerCase()} no admite ninguna operación`,
      );
    }

    const indice = desafio.participantes.findIndex(
      (p) => p.toString() === personaId,
    );
    if (indice === -1) {
      throw new ConflictException('La persona no participa de este desafío');
    }

    desafio.participantes.splice(indice, 1);
    desafio.abandonados = [
      ...(desafio.abandonados ?? []),
      new Types.ObjectId(personaId),
    ];

    return await desafio.save();
  }

  /**
   * Verifica que quien ejecuta la operación sea el creador del desafío.
   */
  private verificarCreador(desafio: DesafioDocument, creadorId: string): void {
    if (desafio.creador.toString() !== creadorId) {
      throw new ForbiddenException(
        'Solo el creador del desafío puede modificarlo o cancelarlo',
      );
    }
  }
}
