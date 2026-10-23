import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import { CheckIn } from './schemas/check-in.schema';
import { DesafiosService } from '../desafios/desafios.service';
import { PersonasService } from '../personas/personas.service';
import {
  getHoyDesafio,
  sumarDiasFechaCalendario,
} from '../desafios/utils/desafio.utils';
import { getFechaCalendario } from '../personas/utils/date.utils';

describe('CheckInsService', () => {
  let service: CheckInsService;
  let checkInModelMock: any;
  let desafiosServiceMock: { findOne: jest.Mock };
  let personasServiceMock: { findOne: jest.Mock };

  const hoy = getHoyDesafio();
  const idDesafio = new Types.ObjectId().toString();
  const personaOid = new Types.ObjectId();

  /** Query simulada de Mongoose con `exec()` y `sort().exec()`. */
  const queryResult = (resultado: any) => {
    const exec = jest.fn().mockResolvedValue(resultado);
    return { exec, sort: jest.fn().mockReturnValue({ exec }) };
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

  const crearPersonaFake = (
    overrides: Record<string, any> = {},
  ): Record<string, any> => ({
    _id: personaOid,
    nombre: 'Participante',
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    ...overrides,
  });

  const crearDesafioActivo = (
    overrides: Record<string, any> = {},
  ): Record<string, any> => ({
    _id: new Types.ObjectId(idDesafio),
    nombre: 'Desafío activo',
    participantes: [personaOid],
    fechaInicio: sumarDiasFechaCalendario(hoy, -5),
    fechaFin: sumarDiasFechaCalendario(hoy, 10),
    cancelado: false,
    ...overrides,
  });

  beforeEach(async () => {
    checkInModelMock = jest.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
    });
    checkInModelMock.findOne = jest
      .fn()
      .mockImplementation(() => queryResult(null));
    checkInModelMock.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    checkInModelMock.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    }));
    checkInModelMock.deleteOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    desafiosServiceMock = {
      findOne: jest.fn().mockResolvedValue(crearDesafioActivo()),
    };
    personasServiceMock = {
      findOne: jest.fn().mockResolvedValue(crearPersonaFake()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInsService,
        { provide: getModelToken(CheckIn.name), useValue: checkInModelMock },
        { provide: DesafiosService, useValue: desafiosServiceMock },
        { provide: PersonasService, useValue: personasServiceMock },
      ],
    }).compile();

    service = module.get<CheckInsService>(CheckInsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registrar', () => {
    it('debe registrar un check-in de hoy (en la zona de la persona) por defecto', async () => {
      const checkIn = await service.registrar(idDesafio, {
        personaId: personaOid.toString(),
        nota: '  Caminé 30 minutos  ',
        valor: 30,
      });

      expect(checkInModelMock).toHaveBeenCalledTimes(1);
      const datos = checkInModelMock.mock.calls[0][0];
      expect(datos.fecha).toBe(hoy);
      expect(datos.nota).toBe('Caminé 30 minutos');
      expect(datos.valor).toBe(30);
      expect(datos.persona.toString()).toBe(personaOid.toString());
      expect(checkIn.fecha).toBe(hoy);
    });

    it('debe aceptar el check-in de ayer (para quien se olvidó)', async () => {
      await service.registrar(idDesafio, {
        personaId: personaOid.toString(),
        fecha: sumarDiasFechaCalendario(hoy, -1),
      });

      expect(checkInModelMock.mock.calls[0][0].fecha).toBe(
        sumarDiasFechaCalendario(hoy, -1),
      );
    });

    it('debe calcular hoy según la zona horaria de la persona', async () => {
      const zonaAuckland = 'Pacific/Auckland';
      personasServiceMock.findOne.mockResolvedValue(
        crearPersonaFake({ zonaHoraria: zonaAuckland }),
      );

      await service.registrar(idDesafio, { personaId: personaOid.toString() });

      expect(checkInModelMock.mock.calls[0][0].fecha).toBe(
        getFechaCalendario(zonaAuckland),
      );
    });

    it('debe rechazar fechas futuras o anteriores a ayer', async () => {
      await expect(
        service.registrar(idDesafio, {
          personaId: personaOid.toString(),
          fecha: sumarDiasFechaCalendario(hoy, 2),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.registrar(idDesafio, {
          personaId: personaOid.toString(),
          fecha: sumarDiasFechaCalendario(hoy, -3),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(checkInModelMock).not.toHaveBeenCalled();
    });

    it('debe rechazar un día anterior al inicio del desafío (desafío que empieza hoy)', async () => {
      desafiosServiceMock.findOne.mockResolvedValue(
        crearDesafioActivo({ fechaInicio: hoy }),
      );

      const error = await capturarError(
        service.registrar(idDesafio, {
          personaId: personaOid.toString(),
          fecha: sumarDiasFechaCalendario(hoy, -1),
        }),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('dentro del rango');
    });

    it('debe rechazar el registro en un desafío que no está ACTIVO', async () => {
      desafiosServiceMock.findOne.mockResolvedValue(
        crearDesafioActivo({ fechaInicio: sumarDiasFechaCalendario(hoy, 5) }),
      );

      const error = await capturarError(
        service.registrar(idDesafio, { personaId: personaOid.toString() }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('ACTIVO');
    });

    it('debe prohibir el registro a quien no participa del desafío', async () => {
      desafiosServiceMock.findOne.mockResolvedValue(
        crearDesafioActivo({ participantes: [new Types.ObjectId()] }),
      );

      await expect(
        service.registrar(idDesafio, { personaId: personaOid.toString() }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debe rechazar un segundo check-in de la misma persona el mismo día', async () => {
      checkInModelMock.findOne.mockImplementation(() =>
        queryResult({ fecha: hoy }),
      );

      const error = await capturarError(
        service.registrar(idDesafio, { personaId: personaOid.toString() }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('Ya existe un check-in');
      expect(checkInModelMock).not.toHaveBeenCalled();
    });

    it('debe devolver 404 si el desafío no existe', async () => {
      desafiosServiceMock.findOne.mockRejectedValue(
        new NotFoundException('No se encontró ningún desafío'),
      );

      await expect(
        service.registrar(idDesafio, { personaId: personaOid.toString() }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deshacer', () => {
    it('debe eliminar el último check-in si es de hoy y devolverlo', async () => {
      const ultimo = { _id: new Types.ObjectId(), fecha: hoy };
      checkInModelMock.findOne.mockImplementation(() => queryResult(ultimo));

      const resultado = await service.deshacer(idDesafio, {
        personaId: personaOid.toString(),
      });

      expect(checkInModelMock.findOne).toHaveBeenCalledWith({
        desafio: expect.anything(),
        persona: personaOid,
      });
      expect(checkInModelMock.deleteOne).toHaveBeenCalledWith({
        _id: ultimo._id,
      });
      expect(resultado).toBe(ultimo);
    });

    it('debe rechazar el deshacer si el último check-in no es de hoy', async () => {
      checkInModelMock.findOne.mockImplementation(() =>
        queryResult({ _id: new Types.ObjectId(), fecha: sumarDiasFechaCalendario(hoy, -1) }),
      );

      const error = await capturarError(
        service.deshacer(idDesafio, { personaId: personaOid.toString() }),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('Solo se puede deshacer');
      expect(checkInModelMock.deleteOne).not.toHaveBeenCalled();
    });

    it('debe devolver 404 si la persona no tiene check-ins en el desafío', async () => {
      await expect(
        service.deshacer(idDesafio, { personaId: personaOid.toString() }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByPersona', () => {
    it('debe listar los check-ins de la persona en el desafío, ordenados por fecha', async () => {
      const checkIns = [{ fecha: hoy }, { fecha: sumarDiasFechaCalendario(hoy, -1) }];
      const sort = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(checkIns),
      });
      checkInModelMock.find.mockReturnValue({ sort });

      const resultado = await service.findByPersona(
        idDesafio,
        personaOid.toString(),
      );

      expect(checkInModelMock.find).toHaveBeenCalledWith({
        desafio: expect.anything(),
        persona: personaOid,
      });
      expect(sort).toHaveBeenCalledWith({ fecha: 1, createdAt: 1 });
      expect(resultado).toBe(checkIns);
    });

    it('debe devolver 404 si el desafío o la persona no existen', async () => {
      desafiosServiceMock.findOne.mockRejectedValue(
        new NotFoundException('No se encontró ningún desafío'),
      );
      await expect(
        service.findByPersona(idDesafio, personaOid.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);

      desafiosServiceMock.findOne.mockResolvedValue(crearDesafioActivo());
      personasServiceMock.findOne.mockRejectedValue(
        new NotFoundException('No se encontró ninguna persona'),
      );
      await expect(
        service.findByPersona(idDesafio, personaOid.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('debe devolver 400 con un id mal formado y 404 si no existe', async () => {
      await expect(service.findOne('no-es-un-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.findOne(new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debe devolver el check-in encontrado', async () => {
      const fake = { _id: new Types.ObjectId(), fecha: hoy };
      checkInModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(fake),
      });

      await expect(service.findOne(fake._id.toString())).resolves.toBe(fake);
    });
  });
});
