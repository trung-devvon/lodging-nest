import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ProvincesModule } from './modules/provinces/provinces.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RoomRatesModule } from './modules/room-rates/room-rates.module';
import { RoomPricingModule } from './modules/room-pricing/room-pricing.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { UploadModule } from './modules/uploads/upload.module';
import { AuditModule } from './modules/audit/audit.module';
import { BookingExtensionsModule } from './modules/booking-extensions/booking-extensions.module';
import { GuestsModule } from './modules/guests/guests.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { StaffModule } from './modules/staff/staff.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    SubscriptionsModule,
    ProvincesModule,
    BranchesModule,
    RoomsModule,
    RoomRatesModule,
    RoomPricingModule,
    BookingsModule,
    UploadModule,
    AuditModule,
    BookingExtensionsModule,
    GuestsModule,
    HousekeepingModule,
    ReviewsModule,
    StaffModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
