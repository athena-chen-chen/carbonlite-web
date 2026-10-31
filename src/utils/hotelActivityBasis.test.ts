import { describe, expect, it } from 'vitest';
import { deriveHotelActivityBasis } from './hotelActivityBasis';

describe('Hotel activity basis', () => {
  it('derives occupied room-nights only from both positive inputs', () => {
    expect(deriveHotelActivityBasis({ activityType: 'HOTEL', rooms: 2, nights: 3 })).toEqual({
      status: 'DERIVED',
      basis: { rooms: 2, nights: 3, roomNights: 6, derivation: 'ROOMS_X_NIGHTS' },
    });
  });

  it.each([
    [{ rooms: undefined, nights: 3 }, 'INCOMPLETE'],
    [{ rooms: 2, nights: undefined }, 'INCOMPLETE'],
    [{ rooms: 0, nights: 3 }, 'INVALID'],
    [{ rooms: -2, nights: 3 }, 'INVALID'],
    [{ rooms: 2, nights: 'bad' }, 'INVALID'],
  ])('fails closed for %o', (values, status) => {
    expect(deriveHotelActivityBasis({ activityType: 'HOTEL', ...values }).status).toBe(status);
  });
});
