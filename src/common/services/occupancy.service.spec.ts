import { OccupancyService } from './occupancy.service';

describe('OccupancyService', () => {
  let service: OccupancyService;

  beforeEach(() => {
    service = new OccupancyService();
  });

  it('extends next available time through consecutive booking chains', () => {
    const nextAvailableAt = service.getNextAvailableAt(
      [
        {
          checkIn: new Date('2025-05-25T10:00:00.000Z'),
          checkOut: new Date('2025-05-25T12:00:00.000Z'),
          actualCheckOut: new Date('2025-05-25T14:00:00.000Z'),
        },
        {
          checkIn: new Date('2025-05-25T16:00:00.000Z'),
          checkOut: new Date('2025-05-25T18:00:00.000Z'),
          actualCheckOut: null,
        },
        {
          checkIn: new Date('2025-05-25T20:00:00.000Z'),
          checkOut: new Date('2025-05-25T22:00:00.000Z'),
          actualCheckOut: null,
        },
      ],
      new Date('2025-05-25T15:00:00.000Z'),
      new Date('2025-05-25T15:30:00.000Z'),
      2,
    );

    expect(nextAvailableAt?.toISOString()).toBe('2025-05-26T00:00:00.000Z');
  });
});
