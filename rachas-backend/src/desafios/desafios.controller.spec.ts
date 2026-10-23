import { Test, TestingModule } from '@nestjs/testing';
import { DesafiosController } from './desafios.controller';
import { DesafiosService } from './desafios.service';

describe('DesafiosController', () => {
  let controller: DesafiosController;
  let service: { [key: string]: jest.Mock };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCodigo: jest.fn(),
      findByPersona: jest.fn(),
      findParticipantes: jest.fn(),
      unirse: jest.fn(),
      abandonar: jest.fn(),
      update: jest.fn(),
      cancelar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DesafiosController],
      providers: [
        {
          provide: DesafiosService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<DesafiosController>(DesafiosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar la creación en el servicio', () => {
    const dto = { creadorId: 'id', nombre: 'Desafío' };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debe delegar la consulta por código en el servicio', () => {
    controller.findByCodigo('ABC234');
    expect(service.findByCodigo).toHaveBeenCalledWith('ABC234');
  });

  it('debe delegar el listado con filtros en el servicio', () => {
    const filtro = { estado: 'ACTIVO', categoria: 'SALUD' };
    controller.findAll(filtro as any);
    expect(service.findAll).toHaveBeenCalledWith(filtro);
  });

  it('debe delegar la consulta de desafíos de una persona en el servicio', () => {
    controller.findByPersona('id-persona');
    expect(service.findByPersona).toHaveBeenCalledWith('id-persona');
  });

  it('debe delegar la consulta de participantes en el servicio', () => {
    controller.findParticipantes('id-del-desafio');
    expect(service.findParticipantes).toHaveBeenCalledWith('id-del-desafio');
  });

  it('debe delegar la unión en el servicio', () => {
    const dto = { codigo: 'ABC234', personaId: 'id-persona' };
    controller.unirse(dto as any);
    expect(service.unirse).toHaveBeenCalledWith(dto);
  });

  it('debe delegar el abandono en el servicio', () => {
    const dto = { personaId: 'id-persona' };
    controller.abandonar('id-del-desafio', dto as any);
    expect(service.abandonar).toHaveBeenCalledWith('id-del-desafio', dto);
  });

  it('debe delegar la modificación en el servicio', () => {
    const dto = { creadorId: 'id', nombre: 'Otro' };
    controller.update('id-del-desafio', dto as any);
    expect(service.update).toHaveBeenCalledWith('id-del-desafio', dto);
  });

  it('debe delegar la cancelación en el servicio', () => {
    const dto = { creadorId: 'id' };
    controller.cancelar('id-del-desafio', dto as any);
    expect(service.cancelar).toHaveBeenCalledWith('id-del-desafio', dto);
  });
});
