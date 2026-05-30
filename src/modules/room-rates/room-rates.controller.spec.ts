import { Test, TestingModule } from '@nestjs/testing';
import { RoomRatesController } from './room-rates.controller';
import { RoomRatesService } from './room-rates.service';
import { BranchesService } from '../branches/branches.service';

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
          provide: BranchesService,
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
