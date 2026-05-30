import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReplyReviewDto, UpdateReviewVisibilityDto, QueryReviewsDto } from './dto/reviews.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List reviews' })
  @ApiResponse({ status: 200, description: 'Paginated list of reviews' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findAll(userId, query);
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a review' })
  @ApiBody({ type: ReplyReviewDto })
  @ApiResponse({ status: 200, description: 'Reply added' })
  reply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, userId, dto);
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle review visibility' })
  @ApiBody({ type: UpdateReviewVisibilityDto })
  @ApiResponse({ status: 200, description: 'Visibility updated' })
  updateVisibility(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateReviewVisibilityDto,
  ) {
    return this.reviewsService.updateVisibility(id, userId, dto);
  }
}
