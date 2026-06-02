import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let reviewsService: {
    findAll: jest.Mock;
    reply: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    reviewsService = {
      findAll: jest.fn(),
      reply: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: reviewsService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('uses access context and role when listing reviews', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    reviewsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll('user-1', 'BRANCH_MANAGER', { branchId: 'b-1' });

    expect(reviewsService.findAll).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
      },
      { branchId: 'b-1' },
    );
  });

  it('uses access context and role when replying to reviews', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    reviewsService.reply.mockResolvedValue({ id: 'review-1' });

    await controller.reply('review-1', 'user-1', 'ORG_OWNER', {
      replyFromStaff: 'Thanks',
    });

    expect(reviewsService.reply).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'ORG_OWNER',
      },
      'review-1',
      { replyFromStaff: 'Thanks' },
    );
  });
});
