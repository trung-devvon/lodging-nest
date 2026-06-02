import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

describe('GuestsController', () => {
  let controller: GuestsController;
  let guestsService: {
    create: jest.Mock;
    findAll: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    guestsService = {
      create: jest.fn(),
      findAll: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestsController],
      providers: [
        {
          provide: GuestsService,
          useValue: guestsService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<GuestsController>(GuestsController);
  });

  it('uses access context before creating guests', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    guestsService.create.mockResolvedValue({ id: 'guest-1' });

    await controller.create('user-1', {
      fullName: 'Guest 1',
      phone: '0901111222',
    });

    expect(accessContextService.getOrganizationIdOrThrow).toHaveBeenCalledWith(
      'user-1',
    );
    expect(guestsService.create).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        fullName: 'Guest 1',
      }),
    );
  });

  it('uses access context before listing guests', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    guestsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll('user-1', { search: 'nguyen' });

    expect(guestsService.findAll).toHaveBeenCalledWith('org-1', {
      search: 'nguyen',
    });
  });
});
