import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PersonasService } from '../personas/personas.service';
import { DesafiosService } from './desafios.service';
import { Desafio } from './schemas/desafio.schema';
import {
  getHoyDesafio,
  sumarDiasFechaCalendario,
} from './utils/desafio.utils';

describe('DesafiosService', () => {
  let service: DesafiosService;
  let desafioModelMock: any;
  let personasServiceMock: { findOne: jest.Mock };

  const hoy = getHoyDesafio();
  const creadorId = new Types.ObjectId().toString();
  const personaId = new Types.ObjectId().toString();
  const idDesafio = new Types.ObjectId().toString();

  /** Crea un objeto que simula un documento de desafío con su `save`. */
  const crearDesafioFake = (overrides: Record<string, any> = {}) => {
    const creador = new Types.ObjectId(creadorId);
    const fake: Record<string, any> = {
      _id: new Types.ObjectId(idDesafio),
      nombre: 'Desafío de prueba',
      descripcion: 'Descripción de prueba',
      categoria: 'SALUD',
      fechaInicio: sumarDiasFechaCalendario(hoy, 5),
      fechaFin: sumarDiasFechaCalendario(hoy, 15),
      maxParticipantes: 10,
      codigoInvitacion: 'ABC234',
      creador,
      participantes: [creador],
      abandonados: [],
      cancelado: false,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };
    return { ...fake, ...overrides };
  };

  const dtoCreateValido = () => ({
    creadorId,
    nombre: 'Caminar 30 minutos',
    descripcion: 'Actividad física diaria',
    categoria: 'SALUD' as const,
    fechaInicio: sumarDiasFechaCalendario(hoy, 5),
    fechaFin: sumarDiasFechaCalendario(hoy, 20),
    maxParticipantes: 8,
  });

  const mockDesafio = (fake: Record<string, any>) => {
    desafioModelMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(fake),
    });
  };

  /** Ejecuta una promesa esperada fallar y devuelve la excepción lanzada. */
  const capturarError = async (promesa: Promise<unknown>): Promise<any> => {
    try {
      await promesa;
      return null;
    } catch (e) {
      return e;
    }
  };

  beforeEach(async () => {
    desafioModelMock = jest.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
    });
    desafioModelMock.find = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    desafioModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    desafioModelMock.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    desafioModelMock.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    personasServiceMock = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(creadorId) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesafiosService,
        {
          provide: getModelToken(Desafio.name),
          useValue: desafioModelMock,
        },
        {
          provide: PersonasService,
          useValue: personasServiceMock,
        },
      ],
    }).compile();

    service = module.get<DesafiosService>(DesafiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un desafío con código de invitación de 6 caracteres y al creador como participante', async () => {
      await service.create(dtoCreateValido());

      expect(desafioModelMock).toHaveBeenCalledTimes(1);
      const datos = desafioModelMock.mock.calls[0][0];
      expect(datos.nombre).toBe('Caminar 30 minutos');
      expect(datos.maxParticipantes).toBe(8);
      expect(datos.codigoInvitacion).toMatch(
        /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
      );
      expect(datos.participantes).toHaveLength(1);
      expect(datos.participantes[0].toString()).toBe(creadorId);
      expect(datos.creador.toString()).toBe(creadorId);
      expect(datos.cancelado).toBe(false);
    });

    it('debe aplicar el máximo de participantes por defecto (10)', async () => {
      const dto = dtoCreateValido() as any;
      delete dto.maxParticipantes;

      await service.create(dto);

      expect(desafioModelMock.mock.calls[0][0].maxParticipantes).toBe(10);
    });

    it('debe rechazar un desafío cuya fecha de inicio ya pasó', async () => {
      const dto = {
        ...dtoCreateValido(),
        fechaInicio: sumarDiasFechaCalendario(hoy, -1),
      };

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(desafioModelMock).not.toHaveBeenCalled();
    });

    it('debe rechazar duraciones menores a 3 días o mayores a 90', async () => {
      await expect(
        service.create({
          ...dtoCreateValido(),
          fechaFin: sumarDiasFechaCalendario(hoy, 6),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.create({
          ...dtoCreateValido(),
          fechaFin: sumarDiasFechaCalendario(hoy, 100),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe rechazar un nombre que quede vacío tras recortar espacios', async () => {
      await expect(
        service.create({ ...dtoCreateValido(), nombre: '  a  ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe propagar el error cuando el creador no existe', async () => {
      personasServiceMock.findOne.mockRejectedValue(
        new NotFoundException('No se encontró ninguna persona'),
      );

      await expect(service.create(dtoCreateValido())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('debe reintentar con otro código si el generado ya existe', async () => {
      desafioModelMock.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ codigoInvitacion: 'ABC234' }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null),
        });

      await service.create(dtoCreateValido());

      expect(desafioModelMock.findOne).toHaveBeenCalledTimes(2);
      expect(desafioModelMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne, findAll y findByCodigo', () => {
    it('debe rechazar ids con formato inválido', async () => {
      await expect(service.findOne('no-es-un-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('debe devolver 404 cuando el desafío no existe', async () => {
      await expect(service.findOne(idDesafio)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('debe devolver el desafío encontrado por id', async () => {
      const fake = crearDesafioFake();
      mockDesafio(fake);

      await expect(service.findOne(idDesafio)).resolves.toBe(fake);
    });

    it('debe devolver todos los desafíos', async () => {
      const fakes = [crearDesafioFake(), crearDesafioFake()];
      desafioModelMock.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fakes),
      });

      await expect(service.findAll()).resolves.toEqual(fakes);
    });

    it('debe rechazar códigos de invitación con formato inválido', async () => {
      await expect(service.findByCodigo('ABC')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('debe devolver 404 cuando ningún desafío usa ese código', async () => {
      await expect(service.findByCodigo('ABC234')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('debe buscar por código normalizado a mayúsculas', async () => {
      const fake = crearDesafioFake();
      desafioModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fake),
      });

      await expect(service.findByCodigo(' abc234 ')).resolves.toBe(fake);
      expect(desafioModelMock.findOne).toHaveBeenCalledWith({
        codigoInvitacion: 'ABC234',
      });
    });
  });

  describe('update', () => {
    it('debe prohibir modificar si no se es el creador', async () => {
      mockDesafio(crearDesafioFake());

      await expect(
        service.update(idDesafio, {
          creadorId: new Types.ObjectId().toString(),
          nombre: 'Otro nombre',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debe rechazar modificaciones sobre un desafío FINALIZADO', async () => {
      mockDesafio(
        crearDesafioFake({
          fechaInicio: sumarDiasFechaCalendario(hoy, -30),
          fechaFin: sumarDiasFechaCalendario(hoy, -10),
        }),
      );

      await expect(
        service.update(idDesafio, { creadorId, nombre: 'Nuevo' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('debe rechazar modificaciones sobre un desafío CANCELADO', async () => {
      mockDesafio(crearDesafioFake({ cancelado: true }));

      await expect(
        service.update(idDesafio, { creadorId, nombre: 'Nuevo' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('debe permitir modificar el nombre mientras esté ACTIVO', async () => {
      const fake = crearDesafioFake({
        fechaInicio: sumarDiasFechaCalendario(hoy, -5),
        fechaFin: sumarDiasFechaCalendario(hoy, 5),
      });
      mockDesafio(fake);

      const resultado = await service.update(idDesafio, {
        creadorId,
        nombre: '  Nuevo nombre  ',
      });

      expect(fake.nombre).toBe('Nuevo nombre');
      expect(fake.save).toHaveBeenCalled();
      expect(resultado).toBe(fake);
    });

    it('debe rechazar el cambio de fechas una vez que el desafío está ACTIVO', async () => {
      const fake = crearDesafioFake({
        fechaInicio: sumarDiasFechaCalendario(hoy, -5),
        fechaFin: sumarDiasFechaCalendario(hoy, 5),
      });
      mockDesafio(fake);

      await expect(
        service.update(idDesafio, {
          creadorId,
          fechaFin: sumarDiasFechaCalendario(hoy, 10),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(fake.save).not.toHaveBeenCalled();
    });

    it('debe rechazar cambiar el máximo de participantes cuando el desafío está ACTIVO', async () => {
      const fake = crearDesafioFake({
        fechaInicio: sumarDiasFechaCalendario(hoy, -5),
        fechaFin: sumarDiasFechaCalendario(hoy, 5),
      });
      mockDesafio(fake);

      await expect(
        service.update(idDesafio, { creadorId, maxParticipantes: 15 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('debe permitir cambiar fechas mientras esté PROGRAMADO', async () => {
      const fake = crearDesafioFake();
      mockDesafio(fake);
      const nuevasFechas = {
        fechaInicio: sumarDiasFechaCalendario(hoy, 10),
        fechaFin: sumarDiasFechaCalendario(hoy, 30),
      };

      await service.update(idDesafio, { creadorId, ...nuevasFechas });

      expect(fake.fechaInicio).toBe(nuevasFechas.fechaInicio);
      expect(fake.fechaFin).toBe(nuevasFechas.fechaFin);
      expect(fake.save).toHaveBeenCalled();
    });

    it('debe rechazar un nuevo inicio en el pasado aunque el desafío siga PROGRAMADO', async () => {
      const fake = crearDesafioFake();
      mockDesafio(fake);

      await expect(
        service.update(idDesafio, {
          creadorId,
          fechaInicio: sumarDiasFechaCalendario(hoy, -1),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debe rechazar un máximo por debajo de los participantes actuales y aceptar uno igual', async () => {
      const participantes = [new Types.ObjectId(), new Types.ObjectId()];
      const fake = crearDesafioFake({ participantes, maxParticipantes: 10 });
      mockDesafio(fake);

      await expect(
        service.update(idDesafio, { creadorId, maxParticipantes: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(fake.save).not.toHaveBeenCalled();

      await service.update(idDesafio, { creadorId, maxParticipantes: 2 });
      expect(fake.maxParticipantes).toBe(2);
      expect(fake.save).toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('debe cancelar un desafío PROGRAMADO', async () => {
      const fake = crearDesafioFake();
      mockDesafio(fake);

      const resultado = await service.cancelar(idDesafio, { creadorId });

      expect(fake.cancelado).toBe(true);
      expect(fake.save).toHaveBeenCalled();
      expect(resultado).toBe(fake);
    });

    it('debe cancelar un desafío ACTIVO', async () => {
      const fake = crearDesafioFake({
        fechaInicio: sumarDiasFechaCalendario(hoy, -5),
        fechaFin: sumarDiasFechaCalendario(hoy, 5),
      });
      mockDesafio(fake);

      await service.cancelar(idDesafio, { creadorId });

      expect(fake.cancelado).toBe(true);
    });

    it('debe rechazar la cancelación si no se es el creador', async () => {
      mockDesafio(crearDesafioFake());

      await expect(
        service.cancelar(idDesafio, {
          creadorId: new Types.ObjectId().toString(),
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debe rechazar cancelar un desafío ya CANCELADO', async () => {
      const fake = crearDesafioFake({ cancelado: true });
      mockDesafio(fake);

      await expect(
        service.cancelar(idDesafio, { creadorId }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(fake.save).not.toHaveBeenCalled();
    });

    it('debe rechazar cancelar un desafío FINALIZADO', async () => {
      mockDesafio(
        crearDesafioFake({
          fechaInicio: sumarDiasFechaCalendario(hoy, -30),
          fechaFin: sumarDiasFechaCalendario(hoy, -10),
        }),
      );

      await expect(
        service.cancelar(idDesafio, { creadorId }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll con filtros', () => {
    it('debe listar todos los desafíos sin filtros', async () => {
      const fakes = [crearDesafioFake(), crearDesafioFake()];
      desafioModelMock.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fakes),
      });

      await expect(service.findAll()).resolves.toEqual(fakes);
      expect(desafioModelMock.find).toHaveBeenCalledWith({});
    });

    it('debe traducir el filtro de estado a criterios de fechas en la consulta', async () => {
      desafioModelMock.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.findAll({ estado: 'ACTIVO' });

      expect(desafioModelMock.find).toHaveBeenCalledWith({
        cancelado: { $ne: true },
        fechaInicio: { $lte: hoy },
        fechaFin: { $gte: hoy },
      });
    });

    it('debe combinar los filtros de estado y categoría', async () => {
      desafioModelMock.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.findAll({ estado: 'PROGRAMADO', categoria: 'SALUD' });

      expect(desafioModelMock.find).toHaveBeenCalledWith({
        cancelado: { $ne: true },
        fechaInicio: { $gt: hoy },
        categoria: 'SALUD',
      });
    });
  });

  describe('findByPersona y findParticipantes', () => {
    it('debe devolver los desafíos en los que participa una persona', async () => {
      const fakes = [crearDesafioFake()];
      desafioModelMock.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fakes),
      });

      await expect(service.findByPersona(personaId)).resolves.toEqual(fakes);
      expect(personasServiceMock.findOne).toHaveBeenCalledWith(personaId);
      expect(desafioModelMock.find).toHaveBeenCalledWith({
        participantes: personaId,
      });
    });

    it('debe devolver 404 al consultar los desafíos de una persona inexistente', async () => {
      personasServiceMock.findOne.mockRejectedValueOnce(
        new NotFoundException('No se encontró ninguna persona'),
      );

      await expect(service.findByPersona(personaId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('debe devolver los participantes poblados de un desafío', async () => {
      const participantes = [{ _id: new Types.ObjectId(creadorId) }];
      const populate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ participantes }),
      });
      desafioModelMock.findById.mockReturnValue({ populate });

      await expect(service.findParticipantes(idDesafio)).resolves.toBe(
        participantes,
      );
      expect(populate).toHaveBeenCalledWith('participantes');
    });

    it('debe devolver 404 al consultar participantes de un desafío inexistente', async () => {
      const populate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      desafioModelMock.findById.mockReturnValue({ populate });

      await expect(service.findParticipantes(idDesafio)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('unirse', () => {
    const mockPorCodigo = (fake: Record<string, any> | null) => {
      desafioModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fake),
      });
    };

    it('debe agregar a la persona como participante', async () => {
      const fake = crearDesafioFake();
      mockPorCodigo(fake);
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(personaId),
      });

      const resultado = await service.unirse({ codigo: 'ABC234', personaId });

      expect(fake.participantes).toHaveLength(2);
      expect(fake.participantes[1].toString()).toBe(personaId);
      expect(fake.save).toHaveBeenCalled();
      expect(resultado).toBe(fake);
    });

    it('debe rechazar la unión a un desafío FINALIZADO o CANCELADO', async () => {
      mockPorCodigo(
        crearDesafioFake({
          fechaInicio: sumarDiasFechaCalendario(hoy, -30),
          fechaFin: sumarDiasFechaCalendario(hoy, -10),
        }),
      );
      await expect(
        service.unirse({ codigo: 'ABC234', personaId }),
      ).rejects.toBeInstanceOf(ConflictException);

      mockPorCodigo(crearDesafioFake({ cancelado: true }));
      await expect(
        service.unirse({ codigo: 'ABC234', personaId }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('debe rechazar unirse dos veces al mismo desafío', async () => {
      const otraPersona = new Types.ObjectId(personaId);
      mockPorCodigo(
        crearDesafioFake({
          participantes: [new Types.ObjectId(creadorId), otraPersona],
        }),
      );
      personasServiceMock.findOne.mockResolvedValue({ _id: otraPersona });

      const error = await capturarError(
        service.unirse({ codigo: 'ABC234', personaId }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('ya participa');
    });

    it('debe impedir volver a unirse después de abandonar', async () => {
      mockPorCodigo(
        crearDesafioFake({ abandonados: [new Types.ObjectId(personaId)] }),
      );
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(personaId),
      });

      const error = await capturarError(
        service.unirse({ codigo: 'ABC234', personaId }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('abandonó');
    });

    it('debe rechazar la unión cuando no hay cupo', async () => {
      mockPorCodigo(
        crearDesafioFake({
          participantes: [new Types.ObjectId(creadorId)],
          maxParticipantes: 1,
        }),
      );
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(personaId),
      });

      const error = await capturarError(
        service.unirse({ codigo: 'ABC234', personaId }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('cupos');
    });

    it('debe rechazar la unión si la persona ya tiene 5 desafíos vigentes', async () => {
      const fake = crearDesafioFake();
      mockPorCodigo(fake);
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(personaId),
      });
      desafioModelMock.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const error = await capturarError(
        service.unirse({ codigo: 'ABC234', personaId }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('5 desafíos vigentes');
      expect(fake.save).not.toHaveBeenCalled();
    });

    it('debe contar los desafíos vigentes con el filtro correcto (incluye los creadidos)', async () => {
      mockPorCodigo(crearDesafioFake());
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(personaId),
      });

      await service.unirse({ codigo: 'ABC234', personaId });

      expect(desafioModelMock.countDocuments).toHaveBeenCalledWith({
        participantes: personaId,
        cancelado: { $ne: true },
        fechaFin: { $gte: hoy },
      });
    });

    it('debe devolver 404 si el código no corresponde a ningún desafío', async () => {
      mockPorCodigo(null);

      await expect(
        service.unirse({ codigo: 'ZZZZ99', personaId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('abandonar', () => {
    it('debe quitar a la persona de los participantes y registrarla en el historial', async () => {
      const otraPersona = new Types.ObjectId(personaId);
      const fake = crearDesafioFake({
        participantes: [new Types.ObjectId(creadorId), otraPersona],
      });
      mockDesafio(fake);
      personasServiceMock.findOne.mockResolvedValue({ _id: otraPersona });

      const resultado = await service.abandonar(idDesafio, { personaId });

      expect(fake.participantes).toHaveLength(1);
      expect(fake.abandonados).toHaveLength(1);
      expect(fake.abandonados[0].toString()).toBe(personaId);
      expect(fake.save).toHaveBeenCalled();
      expect(resultado).toBe(fake);
    });

    it('debe impedir que el creador abandone; debe cancelarlo', async () => {
      mockDesafio(crearDesafioFake());
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(creadorId),
      });

      const error = await capturarError(
        service.abandonar(idDesafio, { personaId: creadorId }),
      );

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toContain('cancelarlo');
    });

    it('debe rechazar el abandono de una persona que no participa', async () => {
      mockDesafio(crearDesafioFake());
      personasServiceMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(personaId),
      });

      await expect(
        service.abandonar(idDesafio, { personaId }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('debe rechazar el abandono en un desafío FINALIZADO o CANCELADO', async () => {
      const otraPersona = new Types.ObjectId(personaId);
      mockDesafio(
        crearDesafioFake({
          participantes: [new Types.ObjectId(creadorId), otraPersona],
          fechaInicio: sumarDiasFechaCalendario(hoy, -30),
          fechaFin: sumarDiasFechaCalendario(hoy, -10),
        }),
      );
      personasServiceMock.findOne.mockResolvedValue({ _id: otraPersona });
      await expect(
        service.abandonar(idDesafio, { personaId }),
      ).rejects.toBeInstanceOf(ConflictException);

      mockDesafio(
        crearDesafioFake({
          participantes: [new Types.ObjectId(creadorId), otraPersona],
          cancelado: true,
        }),
      );
      await expect(
        service.abandonar(idDesafio, { personaId }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
