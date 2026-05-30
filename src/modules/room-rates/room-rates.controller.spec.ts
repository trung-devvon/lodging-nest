import { Test, TestingModule } from '@nestjs/testing';
import { RoomRatesController } from './room-rates.controller';

describe('RoomRatesController', () => {
  let controller: RoomRatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomRatesController],
    }).compile();

    controller = module.get<RoomRatesController>(RoomRatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
