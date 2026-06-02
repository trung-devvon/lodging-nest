import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessContextService } from '../../common/services/access-context.service';
import { successResponseSchema } from '../../common/swagger/response-schema.util';
import {
  QueryReviewsDto,
  ReplyReviewDto,
  UpdateReviewVisibilityDto,
} from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List reviews' })
  @ApiQuery({ name: 'branchId', required: false, example: 'uuid-branch-001' })
  @ApiQuery({ name: 'rating', required: false, example: 5 })
  @ApiQuery({ name: 'isPublished', required: false, example: true })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reviews',
    schema: successResponseSchema(
      [
        {
          id: 'uuid-review-001',
          booking: {
            bookingCode: 'BK-20250520-X1Y2',
            checkIn: '2025-05-20T14:00:00.000Z',
          },
          guest: {
            fullName: 'Pham Thi Dung',
          },
          room: {
            name: 'Phong Deluxe Giuong Doi - 101',
          },
          rating: 5,
          comment: 'Phong sach, nhan vien nhiet tinh, view bien dep',
          replyFromStaff: null,
          repliedAt: null,
          isPublished: true,
          createdAt: '2025-05-21T09:00:00.000Z',
        },
      ],
      { total: 24, page: 1, limit: 20 },
    ),
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryReviewsDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.reviewsService.findAll({
      organizationId,
      userId,
      role,
    }, query);
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Reply to a review' })
  @ApiParam({ name: 'id', example: 'uuid-review-001' })
  @ApiBody({ type: ReplyReviewDto })
  @ApiResponse({
    status: 200,
    description: 'Reply added',
    schema: successResponseSchema({
      id: 'uuid-review-001',
      replyFromStaff:
        'Cam on ban da ghe tham An Nhien Homestay. Hen gap lai!',
      repliedAt: '2025-05-21T10:00:00.000Z',
    }),
  })
  async reply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: ReplyReviewDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.reviewsService.reply(
      {
        organizationId,
        userId,
        role,
      },
      id,
      dto,
    );
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Toggle review visibility' })
  @ApiParam({ name: 'id', example: 'uuid-review-001' })
  @ApiBody({ type: UpdateReviewVisibilityDto })
  @ApiResponse({
    status: 200,
    description: 'Visibility updated',
    schema: successResponseSchema({
      id: 'uuid-review-001',
      isPublished: false,
      updatedAt: '2025-05-21T10:15:00.000Z',
    }),
  })
  async updateVisibility(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateReviewVisibilityDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.reviewsService.updateVisibility(
      {
        organizationId,
        userId,
        role,
      },
      id,
      dto,
    );
  }
}
