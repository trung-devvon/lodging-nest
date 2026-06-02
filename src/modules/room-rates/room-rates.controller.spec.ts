import { Test, TestingModule } from '@nestjs/testing';
import { RoomRatesController } from './room-rates.controller';
import { RoomRatesService } from './room-rates.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('RoomRatesController', () => {
  let controller: RoomRatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomRatesController],
      providers: [
        {
          provide: RoomRatesService,
          useValue: {},
        },
        {
          provide: AccessContextService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RoomRatesController>(RoomRatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
