import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryReviewsDto,
  ReplyReviewDto,
  UpdateReviewVisibilityDto,
} from './dto/reviews.dto';

interface ReviewActorContext {
  organizationId: string;
  userId: string;
  role: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessContextService: AccessContextService,
  ) {}

  async findAll(actor: ReviewActorContext, query: QueryReviewsDto) {
    const { page = 1, limit = 20, rating, isPublished } = query;
    const skip = (page - 1) * limit;
    const branchId = await this.resolveScopedBranchId(actor, query.branchId);

    const where: {
      branch: {
        organizationId: string;
        deletedAt: null;
      };
      branchId?: string;
      rating?: number;
      isPublished?: boolean;
    } = {
      branch: {
        organizationId: actor.organizationId,
        deletedAt: null,
      },
    };
    if (branchId) where.branchId = branchId;
    if (rating !== undefined) where.rating = rating;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          replyFromStaff: true,
          repliedAt: true,
          isPublished: true,
          createdAt: true,
          booking: {
            select: {
              bookingCode: true,
              checkIn: true,
            },
          },
          guestProfile: {
            select: {
              fullName: true,
            },
          },
          room: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews.map(({ guestProfile, ...review }) => ({
        ...review,
        guest: guestProfile,
      })),
      meta: { total, page, limit },
    };
  }

  async reply(
    actor: ReviewActorContext,
    id: string,
    dto: ReplyReviewDto,
  ) {
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        branch: {
          organizationId: actor.organizationId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        branchId: true,
      },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      actor.userId,
      actor.organizationId,
      actor.role,
      review.branchId,
      'reviews',
    );

    const repliedByStaffId = await this.resolveReplyStaffId(actor);

    return this.prisma.review.update({
      where: { id },
      data: {
        replyFromStaff: dto.replyFromStaff,
        repliedByStaffId,
        repliedAt: new Date(),
      },
      select: {
        id: true,
        replyFromStaff: true,
        repliedAt: true,
      },
    });
  }

  async updateVisibility(
    actor: ReviewActorContext,
    id: string,
    dto: UpdateReviewVisibilityDto,
  ) {
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        branch: {
          organizationId: actor.organizationId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        branchId: true,
      },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      actor.userId,
      actor.organizationId,
      actor.role,
      review.branchId,
      'reviews',
    );

    return this.prisma.review.update({
      where: { id },
      data: { isPublished: dto.isPublished },
      select: {
        id: true,
        isPublished: true,
        updatedAt: true,
      },
    });
  }

  private async resolveScopedBranchId(
    actor: ReviewActorContext,
    requestedBranchId?: string,
  ) {
    if (actor.role !== 'BRANCH_MANAGER') {
      return requestedBranchId;
    }

    const staff = await this.accessContextService.getActiveStaffOrThrow(
      actor.userId,
      actor.organizationId,
      [StaffRole.BRANCH_MANAGER],
    );

    if (!staff.branchId) {
      throw new ForbiddenException(
        'Active branch assignment is required for this action',
      );
    }

    if (requestedBranchId && requestedBranchId !== staff.branchId) {
      throw new ForbiddenException(
        'You can only manage reviews in your assigned branch',
      );
    }

    return staff.branchId;
  }

  private async resolveReplyStaffId(actor: ReviewActorContext) {
    if (actor.role === 'ORG_OWNER') {
      return null;
    }

    const staff = await this.accessContextService.getActiveStaffOrThrow(
      actor.userId,
      actor.organizationId,
      [StaffRole.ORG_MANAGER, StaffRole.BRANCH_MANAGER],
    );

    return staff.id;
  }
}
