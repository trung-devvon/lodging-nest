import { PrismaService } from '../../prisma/prisma.service';

export async function isRoomAvailable(
  prisma: PrismaService,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { branch: true },
  });
  if (!room) return false;

  const bufferHours = room.bufferHours ?? room.branch.bufferHours ?? 2;
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      checkIn: { lt: new Date(checkOut.getTime() + bufferHours * 60 * 60 * 1000) },
      checkOut: { gt: checkIn },
    },
  });
  return !conflictingBooking;
}
