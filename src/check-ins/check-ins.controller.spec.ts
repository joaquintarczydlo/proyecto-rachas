import { Test, TestingModule } from '@nestjs/testing';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';

describe('CheckInsController', () => {
  let controller: CheckInsController;
  let service: { [key: string]: jest.Mock };

  const idDesafio = 'id-del-desafio';

  beforeEach(async () => {
    service = {
      registrar: jest.fn(),
      deshacer: jest.fn(),
      findByPersona: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInsController],
      providers: [
        {
          provide: CheckInsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<CheckInsController>(CheckInsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar el registro en el servicio', () => {
    const dto = { personaId: 'id-persona', valor: 30 };
    controller.registrar(idDesafio, dto as any);
    expect(service.registrar).toHaveBeenCalledWith(idDesafio, dto);
  });

  it('debe delegar el listado en el servicio', () => {
    controller.findByPersona(idDesafio, { personaId: 'id-persona' } as any);
    expect(service.findByPersona).toHaveBeenCalledWith(
      idDesafio,
      'id-persona',
    );
  });

  it('debe delegar el deshacer en el servicio', () => {
    const dto = { personaId: 'id-persona' };
    controller.deshacer(idDesafio, dto as any);
    expect(service.deshacer).toHaveBeenCalledWith(idDesafio, dto);
  });
});
