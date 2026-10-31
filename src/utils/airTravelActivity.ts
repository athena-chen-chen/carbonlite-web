export type AirTravelActivityMetadataV1 = {
  schemaVersion: 1;
  type: 'AIR_TRAVEL';
  originAirport: string;
  destinationAirport: string;
  passengerCount: number;
  tripType: 'ONE_WAY' | 'ROUND_TRIP';
};

export function normalizeAirTravelActivityMetadata(value: unknown): AirTravelActivityMetadataV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const originAirport = String(input.originAirport ?? '').trim().toUpperCase();
  const destinationAirport = String(input.destinationAirport ?? '').trim().toUpperCase();
  const passengerCount = Number(input.passengerCount);
  const tripType = String(input.tripType ?? '').trim().toUpperCase();
  if (input.schemaVersion !== 1 || input.type !== 'AIR_TRAVEL') return null;
  if (!/^[A-Z]{3}$/.test(originAirport) || !/^[A-Z]{3}$/.test(destinationAirport)) return null;
  if (originAirport === destinationAirport || !Number.isSafeInteger(passengerCount) || passengerCount <= 0) return null;
  if (tripType !== 'ONE_WAY' && tripType !== 'ROUND_TRIP') return null;
  return { schemaVersion: 1, type: 'AIR_TRAVEL', originAirport, destinationAirport, passengerCount, tripType };
}
