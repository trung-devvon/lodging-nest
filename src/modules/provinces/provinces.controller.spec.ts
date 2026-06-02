import { Test, TestingModule } from '@nestjs/testing';
import { ProvincesController } from './provinces.controller';
import { ProvincesService } from './provinces.service';

describe('ProvincesController', () => {
  let controller: ProvincesController;
  let provincesService: {
    findAll: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    provincesService = {
      findAll: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvincesController],
      providers: [
        {
          provide: ProvincesService,
          useValue: provincesService,
        },
      ],
    }).compile();

    controller = module.get<ProvincesController>(ProvincesController);
  });

  it('forwards public list requests to provinces service', async () => {
    provincesService.findAll.mockResolvedValue([]);

    await controller.findAll();

    expect(provincesService.findAll).toHaveBeenCalled();
  });

  it('forwards create requests to provinces service', async () => {
    provincesService.create.mockResolvedValue({ id: 'prov-1' });

    await controller.create({
      name: 'Phu Quoc',
      slug: 'phu-quoc',
      region: 'SOUTH' as any,
    });

    expect(provincesService.create).toHaveBeenCalledWith({
      name: 'Phu Quoc',
      slug: 'phu-quoc',
      region: 'SOUTH',
    });
  });
});
