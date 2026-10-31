import { normalizeActivityType } from './activityType';

export type HotelActivityBasis = {
  rooms: number;
  nights: number;
  roomNights: number;
  derivation: 'ROOMS_X_NIGHTS';
};

export type HotelActivityBasisResult =
  | { status: 'ABSENT' }
  | { status: 'INCOMPLETE' | 'INVALID'; rooms?: number; nights?: number }
  | { status: 'DERIVED'; basis: HotelActivityBasis };

function positiveNumber(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function deriveHotelActivityBasis(input: {
  activityType?: string | null;
  rooms?: unknown;
  nights?: unknown;
}): HotelActivityBasisResult {
  if (normalizeActivityType(input.activityType) !== 'HOTEL') return { status: 'ABSENT' };

  const hasRooms = input.rooms !== null && input.rooms !== undefined && String(input.rooms).trim() !== '';
  const hasNights = input.nights !== null && input.nights !== undefined && String(input.nights).trim() !== '';
  if (!hasRooms && !hasNights) return { status: 'ABSENT' };

  const rooms = positiveNumber(input.rooms);
  const nights = positiveNumber(input.nights);
  if (rooms === null || nights === null) return { status: 'INVALID' };
  if (rooms === undefined || nights === undefined) {
    return {
      status: 'INCOMPLETE',
      ...(rooms === undefined ? {} : { rooms }),
      ...(nights === undefined ? {} : { nights }),
    };
  }

  return {
    status: 'DERIVED',
    basis: { rooms, nights, roomNights: rooms * nights, derivation: 'ROOMS_X_NIGHTS' },
  };
}

export function readHotelBasisColumns(row: Record<string, unknown>) {
  const entries = Object.entries(row);
  const read = (aliases: string[]) => entries.find(([key]) =>
    aliases.includes(key.toLowerCase().replace(/[^a-z0-9]/g, '')),
  )?.[1];
  return { rooms: read(['rooms', 'roomcount', 'numberofrooms']), nights: read(['nights', 'nightcount', 'numberofnights']) };
}
