export type MatchableConversionFactor = {
  id: string;
  organizationId?: string | null;
  name: string;
  type?: string | null;
  activityType?: string | null;
  inputUnit?: string | null;
  unit?: string | null;
  factorValue: string | number;
  resultUnit?: string | null;
  isSystemDefault?: boolean | null;
  isDefault?: boolean | null;
  sourceAuthority?: string | null;
  sourceName?: string | null;
  sourceYear?: number | null;
  verified?: boolean | null;
  updatedAt?: string | null;
};

export type ConversionFactorMatch = {
  factor: MatchableConversionFactor;
  sourceLabel: 'Organization Custom Factor' | 'System Default Factor';
};

export function findBestConversionFactorMatch(input: {
  activityType?: string | null;
  inputUnit?: string | null;
  organizationId?: string | null;
  factors: MatchableConversionFactor[];
}): ConversionFactorMatch | undefined {
  const activityType = normalizeActivityType(input.activityType);
  const inputUnit = normalizeUnit(input.inputUnit);
  const organizationId = String(input.organizationId ?? '').trim();

  if (!activityType || !inputUnit) return undefined;

  const matchingFactors = input.factors.filter((factor) => {
    const factorKind = String(factor.type ?? 'EMISSION').trim().toUpperCase();

    return (
      factorKind === 'EMISSION' &&
      normalizeActivityType(factor.activityType) === activityType &&
      normalizeUnit(getFactorInputUnit(factor)) === inputUnit &&
      Number.isFinite(Number(factor.factorValue))
    );
  });

  const organizationFactor = matchingFactors
    .filter((factor) =>
      organizationId
        ? String(factor.organizationId ?? '') === organizationId
        : Boolean(factor.organizationId) && !factor.isSystemDefault,
    )
    .sort(compareNewestDefaultFirst)[0];

  if (organizationFactor) {
    return {
      factor: organizationFactor,
      sourceLabel: 'Organization Custom Factor',
    };
  }

  const systemFactor = matchingFactors
    .filter((factor) => Boolean(factor.isSystemDefault))
    .sort(compareNewestDefaultFirst)[0];

  if (systemFactor) {
    return {
      factor: systemFactor,
      sourceLabel: 'System Default Factor',
    };
  }

  return undefined;
}

export function getFactorSourceAuthority(factor: MatchableConversionFactor) {
  return factor.sourceAuthority || factor.sourceName || '';
}

function getFactorInputUnit(factor: MatchableConversionFactor) {
  return factor.inputUnit || factor.unit || '';
}

function compareNewestDefaultFirst(
  a: MatchableConversionFactor,
  b: MatchableConversionFactor,
) {
  if (Number(a.isDefault) !== Number(b.isDefault)) {
    return Number(b.isDefault) - Number(a.isDefault);
  }

  return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
}

export function normalizeActivityType(value?: string | null) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_');
}

export function normalizeUnit(value?: string | null) {
  const unit = String(value ?? '').trim().toLowerCase();
  const compact = unit.replace(/[\s._-]+/g, '');

  const aliases: Record<string, string> = {
    l: 'l',
    liter: 'l',
    liters: 'l',
    litre: 'l',
    litres: 'l',
    kwh: 'kwh',
    kwhr: 'kwh',
    kilowatthour: 'kwh',
    kilowatthours: 'kwh',
    m3: 'm3',
    'm³': 'm3',
    cubicmeter: 'm3',
    cubicmeters: 'm3',
    cubicmetre: 'm3',
    cubicmetres: 'm3',
    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    km: 'km',
    kilometer: 'km',
    kilometers: 'km',
    kilometre: 'km',
    kilometres: 'km',
  };

  return aliases[compact] ?? compact;
}
