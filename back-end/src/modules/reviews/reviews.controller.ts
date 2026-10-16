import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { successResponse } from '../../common/api-response';
import { Roles } from '../../guards/roles.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { SaveReviewDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

// Identity always comes from the session (request.auth); no customer or provider id is accepted from the caller.
@ApiTags('reviews')
@UseGuards(RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('mine')
  @Roles('user')
  @ApiOperation({ summary: 'List the reviews you wrote (customer)' })
  mine(@Req() request: Request) {
    return successResponse(this.reviews.mine(request.auth!));
  }

  @Put('bookings/:bookingId')
  @Roles('user')
  @ApiOperation({ summary: 'Rate one of your completed bookings, or edit your review of it (customer)' })
  save(@Param('bookingId') bookingId: string, @Body() body: SaveReviewDto, @Req() request: Request) {
    this.reviews.assertCustomer(request.auth!);
    return successResponse(this.reviews.save(request.auth!, bookingId, body));
  }

  @Get('provider')
  @Roles('provider')
  @ApiOperation({ summary: 'Your average rating and the reviews customers left you (provider)' })
  forProvider(@Req() request: Request) {
    return successResponse(this.reviews.forProvider(request.auth!));
  }

  // Public on purpose, like the listing itself: only ratings, feedback text and dates, never who wrote them.
  @Get('listings/:listingId')
  @ApiOperation({ summary: "A provider listing's average rating and latest reviews" })
  forListing(@Param('listingId') listingId: string) {
    return successResponse(this.reviews.forListing(listingId));
  }
}
