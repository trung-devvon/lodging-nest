import { PrismaService } from '../../prisma/prisma.service';
import { OccupancyService } from '../services/occupancy.service';

export async function isRoomAvailable(
  prisma: PrismaService,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  const occupancyService = new OccupancyService();
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { branch: true },
  });
  if (!room) return false;

  const bufferHours = occupancyService.getBufferHours(
    room.bufferHours,
    room.branch.bufferHours,
  );
  const conflictingBookings = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      checkIn: {
        lt: occupancyService.getOccupiedUntil({ checkOut }, bufferHours),
      },
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      actualCheckOut: true,
    },
  });
  return !conflictingBookings.some((booking) =>
    occupancyService.hasOccupancyConflict(
      booking,
      checkIn,
      checkOut,
      bufferHours,
    ),
  );
}
