import { Injectable } from '@nestjs/common';

type BookingCheckOutWindow = {
  checkOut: Date;
  actualCheckOut?: Date | null;
};

type BookingOccupancyWindow = BookingCheckOutWindow & {
  checkIn: Date;
};

@Injectable()
export class OccupancyService {
  getBufferHours(
    roomBufferHours?: number | null,
    branchBufferHours?: number | null,
  ) {
    return roomBufferHours ?? branchBufferHours ?? 2;
  }

  getEffectiveCheckOut(booking: BookingCheckOutWindow) {
    return booking.actualCheckOut ?? booking.checkOut;
  }

  getOccupiedUntil(booking: BookingCheckOutWindow, bufferHours: number) {
    return new Date(
      this.getEffectiveCheckOut(booking).getTime() +
        bufferHours * 60 * 60 * 1000,
    );
  }

  hasOccupancyConflict(
    booking: BookingOccupancyWindow,
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    bufferHours: number,
  ) {
    return (
      booking.checkIn <
        this.getOccupiedUntil({ checkOut: requestedCheckOut }, bufferHours) &&
      this.getOccupiedUntil(booking, bufferHours) > requestedCheckIn
    );
  }

  findFirstConflict(
    bookings: BookingOccupancyWindow[],
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    bufferHours: number,
  ) {
    return this.sortByCheckIn(bookings).find((booking) =>
      this.hasOccupancyConflict(
        booking,
        requestedCheckIn,
        requestedCheckOut,
        bufferHours,
      ),
    );
  }

  getNextAvailableAt(
    bookings: BookingOccupancyWindow[],
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    bufferHours: number,
  ) {
    const sortedBookings = this.sortByCheckIn(bookings);
    const firstConflict = this.findFirstConflict(
      sortedBookings,
      requestedCheckIn,
      requestedCheckOut,
      bufferHours,
    );
    if (!firstConflict) return undefined;

    let occupiedUntil = this.getOccupiedUntil(firstConflict, bufferHours);
    const firstConflictIndex = sortedBookings.indexOf(firstConflict);

    for (const booking of sortedBookings.slice(firstConflictIndex + 1)) {
      if (booking.checkIn > occupiedUntil) {
        break;
      }

      const bookingOccupiedUntil = this.getOccupiedUntil(booking, bufferHours);
      if (bookingOccupiedUntil > occupiedUntil) {
        occupiedUntil = bookingOccupiedUntil;
      }
    }

    return occupiedUntil;
  }

  private sortByCheckIn(bookings: BookingOccupancyWindow[]) {
    return [...bookings].sort(
      (left, right) => left.checkIn.getTime() - right.checkIn.getTime(),
    );
  }
}
