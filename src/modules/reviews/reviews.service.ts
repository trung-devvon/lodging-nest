import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { ReplyReviewDto, UpdateReviewVisibilityDto, QueryReviewsDto } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(userId: string, query: QueryReviewsDto) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new ForbiddenException('Access denied');

    const { page = 1, limit = 20, branchId, rating, isPublished } = query;
    const skip = (page - 1) * limit;

    const branches = await this.prisma.branch.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const branchIds = branches.map((b) => b.id);

    const where: any = { branchId: { in: branchIds } };
    if (branchId) where.branchId = branchId;
    if (rating) where.rating = rating;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          guestProfile: { select: { id: true, fullName: true } },
          room: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          booking: { select: { id: true, bookingCode: true } },
          repliedByStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reply(id: string, userId: string, dto: ReplyReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (review.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const staff = await this.prisma.staff.findFirst({ where: { userId } });
    if (!staff) throw new NotFoundException('Staff profile not found');

    return this.prisma.review.update({
      where: { id },
      data: {
        replyFromStaff: dto.replyFromStaff,
        repliedByStaffId: staff.id,
        repliedAt: new Date(),
      },
      include: {
        guestProfile: { select: { id: true, fullName: true } },
        room: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        repliedByStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
      },
    });
  }

  async updateVisibility(id: string, userId: string, dto: UpdateReviewVisibilityDto) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (review.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

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
}
