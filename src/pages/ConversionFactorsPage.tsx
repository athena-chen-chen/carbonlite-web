import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  createConversionFactor,
  deleteConversionFactor,
  getConversionFactors,
  updateConversionFactor,
  type ConversionFactorInput,
  type ConversionFactorItem,
} from '../services/conversionFactors';
import { activityTypes } from '../constants/activityTypes';
import {
  canManageConversionFactors,
  getCurrentUser,
  getOrganizationName,
} from '../services/auth';
import { formatScopeClassification, resolveScopeClassification } from '../utils/scopeClassification';
import { getActivityTypeLabel, normalizeActivityType } from '../utils/activityType';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import {
  PILOT_PROVINCE_COVERAGE_HELPER_TEXT,
  getPilotProvinceCode,
  normalizeProvince,
} from '../utils/province';
import { formatCredibilityLabel } from '../utils/factorCredibility';
import { useAppDialog } from '../components/AppDialog';

type ConversionFactorListResponse = {
  items: ConversionFactorItem[];
};

type ConversionFactorRouteState = {
  prefillFactor?: Partial<ConversionFactorInput>;
} | null;

const initialForm: ConversionFactorInput = {
  name: '',
  type: 'EMISSION',
  factorType: 'CUSTOM',
  activityType: '',
  jurisdiction: 'NATIONAL',
  country: 'Canada',
  unit: '',
  factorValue: '' as unknown as number,
  resultUnit: 'kgCO2e',
  sourceName: '',
  sourceReference: '',
  sourceAuthority: '',
  sourceDocument: '',
  sourceYear: '' as unknown as number,
  sourceUrl: '',
  factorVersion: 'v1.0',
  assumptions: '',
  methodology: '',
  confidenceLevel: 'MEDIUM',
  verificationStatus: 'DRAFT',
  verified: false,
  notes: '',
  isDefault: true,
};

const CUSTOM_FACTOR_TYPE = 'CUSTOM';
const NATIONAL_JURISDICTION = 'NATIONAL';
const NATIONAL_JURISDICTION_LABEL = 'Canada - National';
const JURISDICTION_OPTIONS = [
  { value: NATIONAL_JURISDICTION, label: NATIONAL_JURISDICTION_LABEL },
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'ON', label: 'Ontario' },
] as const;
const JURISDICTION_FILTER_OPTIONS = [
  { value: '', label: 'All jurisdictions' },
  ...JURISDICTION_OPTIONS,
] as const;

export function getFactorJurisdiction(item: ConversionFactorItem) {
  const region = item.jurisdiction?.trim() || item.region?.trim() || '';
  const country = item.country?.trim() || '';
  if (isProvinceRequiredJurisdiction(region)) return 'Province Required';
  return formatJurisdictionDisplay(region, country);
}

export function getFactorTraceability(item: ConversionFactorItem) {
  return {
    jurisdiction: getFactorJurisdiction(item),
    sourceAuthority: formatPilotSourceAuthority(item),
    sourceDocument: formatPilotSourceDocument(item),
    sourceYear: item.sourceYear ?? null,
    sourceUrl: item.sourceUrl ?? '',
    factorVersion: formatPilotFactorVersion(item),
    assumptions: formatPilotAssumptions(item),
    methodology: item.methodology || '',
    confidenceLevel: formatPilotConfidence(item),
    verificationStatus: formatPilotVerification(item),
    verified: Boolean(item.verified),
    notes: item.notes || '',
  };
}

function isWaterTrackedFactor(item: Pick<
  ConversionFactorItem,
  'activityType' | 'name' | 'sourceDocument' | 'sourceReference'
>) {
  const text = [
    item.activityType,
    item.name,
    item.sourceDocument,
    item.sourceReference,
  ].join(' ').toLowerCase();

  return String(item.activityType ?? '').toUpperCase() === 'WATER' || text.includes('water');
}

function isElectricityFactor(item: Pick<ConversionFactorItem, 'activityType' | 'name'>) {
  return (
    String(item.activityType ?? '').toUpperCase() === 'ELECTRICITY' ||
    String(item.name ?? '').toLowerCase().includes('electricity')
  );
}

function isProvinceRequiredJurisdiction(value?: string | null) {
  return String(value ?? '').trim().toLowerCase() === 'province required';
}

function isPlaceholderElectricityFactor(item: ConversionFactorItem) {
  return (
    isElectricityFactor(item) &&
    isProvinceRequiredJurisdiction(getFactorJurisdiction(item))
  );
}

function isPilotDefaultFactor(item: ConversionFactorItem) {
  return isSystemFactor(item) || String(item.sourceAuthority ?? '').toLowerCase().includes('carbonlite');
}

function isFuelFactor(item: Pick<ConversionFactorItem, 'activityType'>) {
  return ['NATURAL_GAS', 'GASOLINE', 'DIESEL'].includes(
    String(item.activityType ?? '').toUpperCase(),
  );
}

function isScope3Factor(item: Pick<ConversionFactorItem, 'activityType'>) {
  return ['AIR_TRAVEL', 'HOTEL', 'GROUND_TRANSPORT', 'SHIPPING'].includes(
    String(item.activityType ?? '').toUpperCase(),
  );
}

function formatPilotSourceAuthority(item: ConversionFactorItem) {
  return item.sourceAuthority || item.sourceName || (isPilotDefaultFactor(item) ? 'CarbonLite' : '');
}

function formatPilotSourceDocument(item: ConversionFactorItem) {
  const value = String(item.sourceDocument || item.sourceReference || '').trim();
  if (value) return value;
  if (isPilotDefaultFactor(item)) return 'CarbonLite MVP Default Factors v1.0';
  return 'Source review required';
}

function formatPilotFactorVersion(item: ConversionFactorItem) {
  if (isPilotDefaultFactor(item)) return 'CarbonLite MVP Default Factors v1.0';
  return String(item.factorVersion ?? '').trim() || 'Not versioned — pilot default';
}

function formatPilotConfidence(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) return 'Tracked Metric · No Emissions Factor Required';
  if (isElectricityFactor(item) && isPilotDefaultFactor(item)) return 'Pilot Estimate';
  if (isScope3Factor(item) && isPilotDefaultFactor(item)) return 'Pilot Estimate';
  if (isFuelFactor(item) && isPilotDefaultFactor(item)) return 'Medium — Engineering Estimate';

  const raw = String(item.confidenceLevel ?? '').trim();
  const label = formatCredibilityLabel(raw);
  const normalized = raw.toLowerCase();

  if (normalized.includes('placeholder')) return 'Pilot Estimate';
  if (label === 'Low' && isPilotDefaultFactor(item)) return 'Pilot Estimate';
  return label || (isPilotDefaultFactor(item) ? 'Pilot Estimate' : 'Source Review Required');
}

function formatPilotVerification(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) return 'Tracked Metric · No Emissions Factor Required';
  if (isScope3Factor(item) && isPilotDefaultFactor(item)) {
    return 'Internal Review Required · Consultant Review Recommended';
  }

  const raw = String(item.verificationStatus ?? '').trim();
  const label = formatCredibilityLabel(raw);
  const normalized = raw.toLowerCase();

  if (!raw && isPilotDefaultFactor(item)) return 'Internal Review Required';
  if (normalized === 'draft' || normalized.includes('placeholder') || normalized.includes('pilot demo')) {
    return 'Internal Review Required';
  }
  return label || 'Source Review Required';
}

function formatPilotAssumptions(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) {
    return 'Water is tracked as an operational metric and excluded from GHG emissions totals unless a reviewed water emissions factor is provided.';
  }

  if (isElectricityFactor(item) && isPilotDefaultFactor(item)) {
    return 'Pilot-stage default electricity factor. Uses jurisdiction-specific electricity factor and latest available prior-year factor where no reporting-year factor exists. Replace with reviewed official or consultant-approved factor before formal reporting.';
  }

  if (isFuelFactor(item) && isPilotDefaultFactor(item)) {
    return 'Pilot-stage default fuel combustion factor. Used for workflow validation and calculation traceability. Replace with reviewed official or consultant-approved factor before formal reporting.';
  }

  if (isScope3Factor(item) && isPilotDefaultFactor(item)) {
    return 'Pilot-stage Scope 3 estimate. Scope 3 calculations can vary by methodology, boundary, and factor source. Consultant review recommended before formal reporting.';
  }

  return item.assumptions || item.methodology || item.notes || 'Source review required before formal reporting.';
}

function formatModalReviewGuidance(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) {
    return 'Tracked Metric · No Emissions Factor Required';
  }

  if (isScope3Factor(item)) {
    return 'Consultant Review Recommended before formal reporting.';
  }

  if (isPilotDefaultFactor(item)) {
    return 'Internal Review Required before formal reporting.';
  }

  return 'Use documented source, verification, and reviewer notes before relying on this factor.';
}

function formatFactorValue(value: ConversionFactorItem['factorValue']) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value ?? '-');
  }

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatFactorValueDisplay(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) return 'Tracked only';
  return `${formatFactorValue(item.factorValue)} ${formatFactorUnitDisplay(item)}`;
}

function formatFactorResultUnitDisplay(item: ConversionFactorItem) {
  return isWaterTrackedFactor(item) ? 'Not applicable' : formatFactorUnitDisplay(item);
}

function formatFactorUnitDisplay(item: Pick<ConversionFactorItem, 'resultUnit' | 'unit'>) {
  const resultUnit = String(item.resultUnit || 'kgCO2e').trim();
  if (resultUnit.includes('/')) return resultUnit;

  return `${resultUnit}/${singularUnit(item.unit)}`;
}

function singularUnit(unit?: string | null) {
  const value = String(unit ?? '').trim();
  const normalized = value.toLowerCase();
  if (normalized === 'liters' || normalized === 'litres' || normalized === 'l') return 'liter';
  if (normalized === 'nights') return 'night';
  if (normalized === 'tonnes') return 'tonne';
  return value || 'unit';
}

function formatAuditDate(value?: string | null) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatActivityTypeDisplay(value?: string | null) {
  if (!value) return '-';

  return getActivityTypeLabel(value);
}

function formatFactorNameDisplay(item: ConversionFactorItem) {
  if (!isSystemFactor(item) && item.name) return item.name;

  if (isElectricityFactor(item)) {
    const jurisdiction = getFactorJurisdiction(item);
    if (isProvinceRequiredJurisdiction(jurisdiction)) return 'Electricity - Province Required';
    const region = jurisdiction.split(',')[0]?.trim();
    if (region) {
      return item.sourceYear
        ? `Electricity - ${region} - ${item.sourceYear}`
        : `Electricity - ${region}`;
    }
  }

  const activityTypeLabel = item.activityType ? formatActivityTypeDisplay(item.activityType) : '';

  return activityTypeLabel || item.name;
}

function formatJurisdictionDisplay(region?: string | null, country?: string | null) {
  const cleanRegion = String(region ?? '').trim();
  const cleanCountry = String(country ?? '').trim();
  const pilotCode = getPilotProvinceCode(cleanRegion);

  if (pilotCode) {
    return JURISDICTION_OPTIONS.find((option) => option.value === pilotCode)?.label ?? cleanRegion;
  }

  if (isNationalJurisdiction(cleanRegion, cleanCountry)) {
    return NATIONAL_JURISDICTION_LABEL;
  }

  return normalizeProvince(cleanRegion) ?? (cleanRegion || cleanCountry || NATIONAL_JURISDICTION_LABEL);
}

function isNationalJurisdiction(region?: string | null, country?: string | null) {
  const cleanRegion = String(region ?? '').trim().toLowerCase();
  const cleanCountry = String(country ?? '').trim().toLowerCase();

  return (
    !cleanRegion ||
    cleanRegion === 'national' ||
    cleanRegion === 'canada' ||
    cleanRegion === 'ca' ||
    cleanRegion === NATIONAL_JURISDICTION.toLowerCase() ||
    (!cleanRegion && ['canada', 'ca'].includes(cleanCountry))
  );
}

function defaultScopeForFactor(item: ConversionFactorItem) {
  const resolution = resolveScopeClassification({
    activityType: item.activityType ?? item.name,
    factorDefaultScope: item.defaultScope,
    factorScope: item.scope,
  });

  if (resolution.scope === 'TRACKED_METRIC') {
    return 'Tracked Metric / Not included in emissions total by default';
  }

  return resolution.scope === 'UNCLASSIFIED'
    ? 'Not specified'
    : formatScopeClassification(resolution.scope);
}

function formatMethodologyDisplay(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) {
    return 'Water usage is tracked as an operational metric. CarbonLite does not calculate water-related emissions by default because water emission factors vary by municipality, treatment process, and reporting methodology.';
  }
  if (isPilotDefaultFactor(item)) return formatPilotAssumptions(item);
  return item.methodology || '';
}

function formatNotesDisplay(item: ConversionFactorItem) {
  if (isWaterTrackedFactor(item)) {
    return 'Tracked metric only. Not included in emissions totals unless a reviewed water factor is configured.';
  }
  if (isPilotDefaultFactor(item)) {
    return 'CarbonLite does not certify emissions. Replace pilot-stage defaults with reviewed official or consultant-approved factors before formal reporting.';
  }
  return item.notes || '';
}

function formatTableSourceAuthority(value?: string | null) {
  if (!value) return '-';
  if (value.toLowerCase().includes('carbonlite')) return 'CarbonLite';

  return value;
}

function isSystemFactor(item: Pick<ConversionFactorItem, 'isSystemDefault' | 'factorType' | 'organizationId'>) {
  const factorType = String(item.factorType ?? '').toUpperCase();
  if (factorType === 'CUSTOM') return false;
  if (factorType === 'SYSTEM') return true;

  return (
    item.isSystemDefault ||
    !item.organizationId
  );
}

function getFactorTypeLabel(item: Pick<ConversionFactorItem, 'isSystemDefault' | 'factorType' | 'organizationId'>) {
  return isSystemFactor(item) ? 'CarbonLite System Factor' : 'Custom Factor';
}

function getFactorTypeTableLabel(item: Pick<ConversionFactorItem, 'isSystemDefault' | 'factorType' | 'organizationId'>) {
  return isSystemFactor(item) ? 'System Factor' : 'Custom Factor';
}

function getCustomFactorFormErrors(
  form: ConversionFactorInput,
  existingItems: ConversionFactorItem[],
  editingId: string | null,
) {
  const errors: string[] = [];
  const activityType = normalizeActivityType(form.activityType);
  const factorValue = Number(form.factorValue);
  const sourceYear = Number(form.sourceYear);
  const inputUnit = String(form.unit ?? '').trim();
  const factorUnit = String(form.resultUnit ?? '').trim();
  const country = String(form.country ?? 'Canada').trim();
  const jurisdictionSelection = getJurisdictionSelectValue(form.jurisdiction ?? form.region, country);
  const province = jurisdictionSelection === NATIONAL_JURISDICTION ? '' : jurisdictionSelection;
  const sourceAuthority = String(form.sourceAuthority ?? '').trim();
  const sourceReference = String(
    form.sourceReference ?? form.sourceDocument ?? form.sourceUrl ?? '',
  ).trim();

  if (!String(form.name ?? '').trim()) errors.push('Factor Name is required.');
  if (!activityType) errors.push('Activity Type is required.');
  if (!inputUnit) errors.push('Input Unit is required.');
  if (!factorUnit) errors.push('Factor Unit is required.');
  if (!Number.isFinite(factorValue) || factorValue <= 0) {
    errors.push('Factor Value must be a positive number.');
  }
  if (!Number.isInteger(sourceYear) || sourceYear < 1900 || sourceYear > 2100) {
    errors.push('Source Year is required.');
  }
  if (!sourceAuthority && !sourceReference) {
    errors.push('Source Authority or Source Reference is required.');
  }
  if (activityType === 'ELECTRICITY' && !province) {
    errors.push('Province / Jurisdiction is required for Electricity custom factors.');
  }

  if (
    activityType &&
    inputUnit &&
    Number.isInteger(sourceYear) &&
    hasDuplicateCustomFactor(existingItems, {
      editingId,
      activityType,
      unit: inputUnit,
      country,
      province,
      sourceYear,
    })
  ) {
    errors.push(
      'A custom factor already exists for this activity type, input unit, country, province, and source year.',
    );
  }

  return errors;
}

function hasDuplicateCustomFactor(
  items: ConversionFactorItem[],
  input: {
    editingId: string | null;
    activityType: string;
    unit: string;
    country: string;
    province: string;
    sourceYear: number;
  },
) {
  return items.some((item) => {
    if (item.id === input.editingId) return false;
    if (isSystemFactor(item)) return false;

    return (
      normalizeActivityType(item.activityType) === input.activityType &&
      normalizeFactorUnitKey(item.unit) === normalizeFactorUnitKey(input.unit) &&
      normalizeFactorText(item.country ?? 'Canada') === normalizeFactorText(input.country || 'Canada') &&
      normalizeFactorText(getFactorRegionForDuplicate(item)) === normalizeFactorText(input.province) &&
      Number(item.sourceYear) === input.sourceYear
    );
  });
}

function getFactorRegionForDuplicate(item: ConversionFactorItem) {
  const region = item.region ?? item.jurisdiction ?? '';
  const country = item.country ?? '';
  const normalizedCountry = normalizeFactorText(country);
  const normalizedRegion = normalizeFactorText(region);

  return normalizedRegion === normalizedCountry ? '' : region;
}

function getJurisdictionSelectValue(region?: string | null, country?: string | null) {
  const cleanRegion = String(region ?? '').trim();
  if (!cleanRegion && !country) return NATIONAL_JURISDICTION;
  if (isNationalJurisdiction(cleanRegion, country)) return NATIONAL_JURISDICTION;

  return getPilotProvinceCode(cleanRegion) ?? cleanRegion;
}

function getJurisdictionFilterParam(value: string) {
  if (!value) return undefined;
  if (value === NATIONAL_JURISDICTION) return 'Canada';
  return value;
}

function getPayloadJurisdiction(value?: string | null) {
  const selection = getJurisdictionSelectValue(value, 'Canada');
  if (selection === NATIONAL_JURISDICTION) return 'Canada';
  return selection;
}

function factorMatchesJurisdictionFilter(item: ConversionFactorItem, filterValue: string) {
  if (!filterValue) return true;

  return getJurisdictionSelectValue(item.jurisdiction ?? item.region, item.country) === filterValue;
}

function normalizeFactorUnitKey(value?: string | null) {
  const normalized = normalizeUnitForDisplay(value ?? '');
  return normalized.status === 'valid'
    ? normalized.value.toLowerCase()
    : String(value ?? '').trim().toLowerCase();
}

function normalizeFactorText(value?: string | null) {
  return String(value ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

function getSourceUrlHref(sourceUrl?: string | null) {
  if (!sourceUrl) return '';

  try {
    const url = new URL(sourceUrl);
    if (url.pathname.startsWith('/methodology/')) {
      return url.pathname;
    }
  } catch {
    if (sourceUrl.startsWith('/methodology/')) return sourceUrl;
  }

  return sourceUrl;
}

function getSourceLinkLabel(sourceUrl?: string | null, item?: ConversionFactorItem) {
  const href = getSourceUrlHref(sourceUrl);
  if (!href) return 'View source';
  if (href.includes('/methodology/water-emissions') || (item && isWaterTrackedFactor(item))) {
    return 'View water emissions methodology';
  }
  if (href.includes('/methodology/default-factors')) return 'CarbonLite default factors methodology';
  return 'View methodology';
}

export function ConversionFactorsPage() {
  const location = useLocation();
  const { confirm } = useAppDialog();
  const prefillFactor = (location.state as ConversionFactorRouteState)?.prefillFactor;
  const currentUser = getCurrentUser();
  const organizationName = getOrganizationName(currentUser);
  const canManageFactors = canManageConversionFactors(currentUser);
  const generatedAt = new Date().toLocaleString();
  const [form, setForm] = useState<ConversionFactorInput>(initialForm);
  const [items, setItems] = useState<ConversionFactorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFactorForm, setShowFactorForm] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<ConversionFactorItem | null>(null);
  const [activityTypeFilter, setActivityTypeFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [sourceYearFilter, setSourceYearFilter] = useState('');
  const [minFactorValueFilter, setMinFactorValueFilter] = useState('');
  const [maxFactorValueFilter, setMaxFactorValueFilter] = useState('');
  const [factorValueSort, setFactorValueSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  async function loadItems(filters?: {
    activityType?: string;
    jurisdiction?: string;
    sourceYear?: string;
  }) {
    setLoading(true);
    setError(null);

    try {
      const data = (await getConversionFactors({
        activityType:
          (filters?.activityType ?? activityTypeFilter) || undefined,
        jurisdiction: getJurisdictionFilterParam(filters?.jurisdiction ?? jurisdictionFilter),
        sourceYear: (filters?.sourceYear ?? sourceYearFilter)
          ? Number(filters?.sourceYear ?? sourceYearFilter)
          : undefined,
      })) as ConversionFactorListResponse;
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversion factors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!prefillFactor) return;

    setEditingId(null);
    setShowFactorForm(true);
    setError(null);
    setSuccessMessage(
      `Add a conversion factor for ${
        prefillFactor.activityType ? getActivityTypeLabel(prefillFactor.activityType) : 'this activity'
      } / ${prefillFactor.unit ?? 'this unit'} to include skipped records.`,
    );
    setForm({
      ...initialForm,
      type: prefillFactor.type ?? 'EMISSION',
      activityType: prefillFactor.activityType ?? '',
      unit: prefillFactor.unit ?? '',
      resultUnit: prefillFactor.resultUnit ?? 'kgCO2e',
      isDefault: true,
    });
  }, [prefillFactor]);

  useEffect(() => {
    if (!openActionMenuId) return;

    function closeActionMenu() {
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    }

    function isInsideActiveActionMenu(target: Node | null) {
      const activeButton = actionMenuButtonRefs.current[openActionMenuId];

      return Boolean(
        target &&
          (actionMenuRef.current?.contains(target) || activeButton?.contains(target)),
      );
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (isInsideActiveActionMenu(event.target as Node | null)) return;
      closeActionMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeActionMenu();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (isInsideActiveActionMenu(event.target as Node | null)) return;
      closeActionMenu();
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('scroll', closeActionMenu, true);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('scroll', closeActionMenu, true);
    };
  }, [openActionMenuId]);

  const visibleFactorItems = useMemo(
    () => items.filter((item) => !isPlaceholderElectricityFactor(item)),
    [items],
  );

  const defaultCount = useMemo(
    () => visibleFactorItems.filter((item) => item.isSystemDefault).length,
    [visibleFactorItems],
  );

  const emissionCount = useMemo(
    () => visibleFactorItems.filter((item) => item.type === 'EMISSION').length,
    [visibleFactorItems],
  );

  const activityTypesCovered = useMemo(() => {
    const types = new Set(
      visibleFactorItems
        .map((item) => item.activityType)
        .filter((value): value is string => Boolean(value)),
    );

    return types.size;
  }, [visibleFactorItems]);

  const hiddenPlaceholderCount = useMemo(
    () => items.length - visibleFactorItems.length,
    [items, visibleFactorItems],
  );

  const displayedItems = useMemo(() => {
    const minValue = minFactorValueFilter.trim() === ''
      ? null
      : Number(minFactorValueFilter);
    const maxValue = maxFactorValueFilter.trim() === ''
      ? null
      : Number(maxFactorValueFilter);

    const filtered = visibleFactorItems.filter((item) => {
      if (!factorMatchesJurisdictionFilter(item, jurisdictionFilter)) return false;

      const value = Number(item.factorValue);

      if (!Number.isFinite(value)) {
        return minValue === null && maxValue === null;
      }

      if (minValue !== null && Number.isFinite(minValue) && value < minValue) {
        return false;
      }

      if (maxValue !== null && Number.isFinite(maxValue) && value > maxValue) {
        return false;
      }

      return true;
    });

    if (factorValueSort === 'none') return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = Number(a.factorValue);
      const bValue = Number(b.factorValue);

      if (!Number.isFinite(aValue) && !Number.isFinite(bValue)) return 0;
      if (!Number.isFinite(aValue)) return 1;
      if (!Number.isFinite(bValue)) return -1;

      return factorValueSort === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [factorValueSort, jurisdictionFilter, maxFactorValueFilter, minFactorValueFilter, visibleFactorItems]);

  function updateField<K extends keyof ConversionFactorInput>(
    key: K,
    value: ConversionFactorInput[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function getPayloadFromForm() {
    const activityType = normalizeActivityType(form.activityType) ?? form.activityType;
    const jurisdiction = getPayloadJurisdiction(form.jurisdiction);
    const country = String(form.country ?? 'Canada').trim() || 'Canada';

    return {
      ...form,
      type: 'EMISSION',
      factorType: CUSTOM_FACTOR_TYPE,
      activityType,
      country,
      region: jurisdiction,
      jurisdiction,
      verified: form.verificationStatus === 'CONSULTANT_REVIEWED' ? true : Boolean(form.verified),
      factorValue: Number(form.factorValue),
      sourceYear: form.sourceYear ? Number(form.sourceYear) : undefined,
      isDefault: true,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canManageFactors) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const validationErrors = getCustomFactorFormErrors(form, visibleFactorItems, editingId);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(' '));
        return;
      }

      if (editingId) {
        await updateConversionFactor(editingId, getPayloadFromForm());
        setSuccessMessage('Custom factor updated successfully.');
        setEditingId(null);
        setShowFactorForm(false);
      } else {
        await createConversionFactor(getPayloadFromForm());
        setSuccessMessage('Custom factor created successfully.');
        setShowFactorForm(false);
      }

      setForm(initialForm);
      await loadItems();
      window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
      window.dispatchEvent(new Event('carbonlite:metrics-stale'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingId
          ? 'Failed to update conversion factor'
          : 'Failed to create conversion factor',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditFactor(item: ConversionFactorItem) {
    if (!canManageFactors) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

    if (isSystemFactor(item)) return;

    setEditingId(item.id);
    setShowFactorForm(true);
    setForm({
      name: item.name,
      type: 'EMISSION',
      factorType: CUSTOM_FACTOR_TYPE,
      activityType: item.activityType ?? '',
      jurisdiction: getJurisdictionSelectValue(getFactorRegionForDuplicate(item), item.country),
      region: getJurisdictionSelectValue(getFactorRegionForDuplicate(item), item.country),
      country: item.country ?? 'Canada',
      unit: item.unit,
      factorValue: Number(item.factorValue),
      resultUnit: item.resultUnit,
      sourceName: item.sourceName ?? '',
      sourceReference: item.sourceReference ?? '',
      sourceAuthority: item.sourceAuthority ?? '',
      sourceDocument: item.sourceDocument ?? '',
      sourceYear: item.sourceYear ?? ('' as unknown as number),
      sourceUrl: item.sourceUrl ?? '',
      factorVersion: item.factorVersion ?? '',
      assumptions: item.assumptions ?? '',
      methodology: item.methodology ?? '',
      confidenceLevel: item.confidenceLevel ?? 'MEDIUM',
      verificationStatus: item.verificationStatus ?? 'DRAFT',
      verified: Boolean(item.verified),
      notes: item.notes ?? '',
      isDefault: item.isDefault,
    });
    setError(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setShowFactorForm(false);
    setError(null);
    setSuccessMessage(null);
  }

  async function deleteFactorById(id: string) {
    if (!canManageFactors) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteConversionFactor(id);
      setSuccessMessage('Conversion factor deleted successfully.');
      await loadItems();
      window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
      window.dispatchEvent(new Event('carbonlite:metrics-stale'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversion factor');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFactor(item: ConversionFactorItem) {
    if (!canManageFactors) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

    if (isSystemFactor(item)) return;

    const shouldDelete = await confirm({
      title: 'Delete custom factor',
      message: `Delete custom factor "${item.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!shouldDelete) return;

    await deleteFactorById(item.id);
  }

  function getActionMenuPosition(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    const menuWidth = 130;
    const menuHeight = 106;
    const margin = 8;
    const top =
      rect.bottom + menuHeight + margin > window.innerHeight
        ? Math.max(margin, rect.top - menuHeight - 6)
        : rect.bottom + 6;
    const left = Math.min(
      Math.max(margin, rect.right - menuWidth),
      Math.max(margin, window.innerWidth - menuWidth - margin),
    );

    return { top, left };
  }

  function toggleActionMenu(itemId: string, button: HTMLButtonElement) {
    setOpenActionMenuId((current) => {
      if (current === itemId) {
        setActionMenuPosition(null);
        return null;
      }

      setActionMenuPosition(getActionMenuPosition(button));
      return itemId;
    });
  }

  function closeActionMenu() {
    setOpenActionMenuId(null);
    setActionMenuPosition(null);
  }

  function renderActionMenuPortal() {
    if (!openActionMenuId || !actionMenuPosition) return null;

    const item = items.find((factor) => factor.id === openActionMenuId);
    if (!item) return null;

    return createPortal(
      <div
        ref={actionMenuRef}
        role="menu"
        style={{
          ...overflowMenuStyle,
          position: 'fixed',
          top: actionMenuPosition.top,
          left: actionMenuPosition.left,
          right: 'auto',
          zIndex: 9999,
        }}
      >
        {isSystemFactor(item) || !canManageFactors ? (
          <div style={lockedMenuLabelStyle}>
            {isSystemFactor(item)
              ? 'System factor'
              : 'Only admins can manage custom factors.'}
          </div>
        ) : null}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeActionMenu();
            handleEditFactor(item);
          }}
          disabled={!canManageFactors || isSystemFactor(item) || deletingId === item.id || submitting}
          style={menuItemButtonStyle(!canManageFactors || isSystemFactor(item))}
        >
          Edit
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeActionMenu();
            void handleDeleteFactor(item);
          }}
          disabled={!canManageFactors || isSystemFactor(item) || deletingId === item.id || editingId === item.id}
          style={menuItemDangerStyle(!canManageFactors || isSystemFactor(item) || deletingId === item.id)}
        >
          {deletingId === item.id ? 'Deleting...' : 'Delete'}
        </button>
      </div>,
      document.body,
    );
  }

  function handlePrintFactors() {
    window.print();
  }

  return (
    <div className="conversion-factors-page" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <style>{printStyles}</style>
      <style>{responsiveStyles}</style>
      <div className="print-report-header" style={printHeaderStyle}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>CarbonLite</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 24 }}>Conversion Factors Report</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
          <div>Generated: {generatedAt}</div>
          <div>Organization: {organizationName}</div>
        </div>
      </div>

      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Conversion Factors</h1>
          <p style={{ marginTop: 8, color: '#666' }}>
            Manage the factors used to convert activity data into emissions metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintFactors}
          className="no-print"
          style={printButtonStyle}
        >
          Print Factors
        </button>
      </div>

      <div className="no-print" style={summaryGridStyle}>
        <SummaryCard
          icon="🧮"
          title="Total Factors"
          value={String(visibleFactorItems.length)}
          subtitle="Available conversion rules"
        />

        <SummaryCard
          icon="🌱"
          title="Emission Factors"
          value={String(emissionCount)}
          subtitle="Used for CO₂e calculations"
          accent="#10b981"
        />

        <SummaryCard
          icon="✅"
          title="Default Factors"
          value={String(defaultCount)}
          subtitle="System-provided starter library"
          accent="#3b82f6"
        />

        <SummaryCard
          icon="📊"
          title="Activity Types"
          value={String(activityTypesCovered)}
          subtitle="Covered data categories"
          accent="#f59e0b"
        />
      </div>

      <div className="no-print" style={pilotDisclaimerStyle}>
        System default factors are provided for pilot workflow validation. Users should verify factors against applicable reporting requirements before relying on final reports.
      </div>
      <div className="no-print" style={pilotCoverageNoteStyle}>
        Electricity requires province-specific factors. {PILOT_PROVINCE_COVERAGE_HELPER_TEXT}
        {hiddenPlaceholderCount > 0
          ? ' Province-required validation placeholders are hidden from the factor list.'
          : ''}
      </div>

      {!canManageFactors ? (
        <div className="no-print" style={readOnlyNoticeStyle}>
          Read-only access: system factors are visible to all authenticated users. Only Owners and Admins can create, edit, or delete company-specific factors.
        </div>
      ) : !showFactorForm ? (
        <div className="no-print" style={collapsedFormStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Custom conversion factors</h2>
            <p style={{ marginTop: 6, color: '#666' }}>
              System default factors are already available. Add a custom factor only when you need organization-specific values.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(initialForm);
              setEditingId(null);
              setShowFactorForm(true);
              setError(null);
              setSuccessMessage(null);
            }}
            style={primaryButtonStyle(false)}
          >
            + Add Custom Factor
          </button>
        </div>
      ) : (
      <form className="no-print" onSubmit={handleSubmit} style={formCardStyle}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {editingId ? 'Edit Custom Factor' : 'Add Custom Factor'}
          </h2>
          <p style={{ marginTop: 6, color: '#666' }}>
            {editingId
              ? 'Update this company-specific factor, then save your changes.'
              : 'Create a company-specific factor. System factors remain read-only and unchanged.'}
          </p>
        </div>

        <div style={formGridStyle}>
          <Field label="Activity Type">
            <select
              value={form.activityType ?? ''}
              onChange={(e) => updateField('activityType', e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select --</option>
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {getActivityTypeLabel(type)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Factor Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              style={inputStyle}
              placeholder="e.g. Company diesel factor"
            />
          </Field>

          <Field label="Factor Value">
            <input
              type="number"
              step="any"
              min="0"
              value={form.factorValue}
              onChange={(e) =>
                updateField(
                  'factorValue',
                  e.target.value === '' ? ('' as unknown as number) : Number(e.target.value),
                )
              }
              style={inputStyle}
              placeholder="e.g. 2.68"
            />
          </Field>

          <Field label="Input Unit">
            <input
              type="text"
              value={form.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              style={inputStyle}
              placeholder="e.g. liters"
            />
          </Field>

          <Field label="Factor Unit">
            <input
              type="text"
              value={form.resultUnit}
              onChange={(e) => updateField('resultUnit', e.target.value)}
              style={inputStyle}
              placeholder="e.g. kgCO2e/liter"
            />
          </Field>

          <Field label="Country">
            <input
              type="text"
              value={form.country ?? ''}
              onChange={(e) => updateField('country', e.target.value)}
              style={inputStyle}
              placeholder="e.g. Canada"
            />
          </Field>

          <Field label="Province / Jurisdiction">
            <select
              value={form.jurisdiction ?? ''}
              onChange={(e) => updateField('jurisdiction', e.target.value)}
              style={inputStyle}
            >
              {JURISDICTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Source Reference">
            <input
              type="text"
              value={form.sourceReference ?? ''}
              onChange={(e) => updateField('sourceReference', e.target.value)}
              style={inputStyle}
              placeholder="e.g. 2025 factor table"
            />
          </Field>
        </div>

        <div style={sourceSectionStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Source & Methodology</h3>
          <div style={formGridStyle}>
            <Field label="Source Authority">
              <input
                type="text"
                value={form.sourceAuthority ?? ''}
                onChange={(e) => updateField('sourceAuthority', e.target.value)}
                style={inputStyle}
                placeholder="e.g. Environment and Climate Change Canada"
              />
            </Field>

            <Field label="Source Document">
              <input
                type="text"
                value={form.sourceDocument ?? ''}
                onChange={(e) => updateField('sourceDocument', e.target.value)}
                style={inputStyle}
                placeholder="e.g. Canada National Inventory Report"
              />
            </Field>

            <Field label="Source Year">
              <input
                type="number"
                value={form.sourceYear ?? ''}
                onChange={(e) =>
                  updateField(
                    'sourceYear',
                    e.target.value === '' ? ('' as unknown as number) : Number(e.target.value),
                  )
                }
                style={inputStyle}
                placeholder="e.g. 2025"
              />
            </Field>

            <Field label="Version">
              <input
                type="text"
                value={form.factorVersion ?? ''}
                onChange={(e) => updateField('factorVersion', e.target.value)}
                style={inputStyle}
                placeholder="e.g. v1.0"
              />
            </Field>

            <Field label="Source URL">
              <input
                type="url"
                value={form.sourceUrl ?? ''}
                onChange={(e) => updateField('sourceUrl', e.target.value)}
                style={inputStyle}
                placeholder="https://..."
              />
            </Field>

            <Field label="Confidence Level">
              <select
                value={form.confidenceLevel ?? 'MEDIUM'}
                onChange={(e) => updateField('confidenceLevel', e.target.value)}
                style={inputStyle}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>

            <Field label="Verification Status">
              <select
                value={form.verificationStatus ?? 'DRAFT'}
                onChange={(e) => {
                  updateField('verificationStatus', e.target.value);
                  updateField('verified', e.target.value === 'CONSULTANT_REVIEWED');
                }}
                style={inputStyle}
              >
                <option value="DRAFT">Draft</option>
                <option value="USER_PROVIDED">User Provided</option>
                <option value="CONSULTANT_REVIEWED">Consultant Reviewed</option>
                <option value="INTERNAL_REVIEW_REQUIRED">Internal Review Required</option>
                <option value="PILOT_ESTIMATE">Pilot Estimate</option>
              </select>
            </Field>

            <Field label="Methodology">
              <textarea
                value={form.methodology ?? ''}
                onChange={(e) => updateField('methodology', e.target.value)}
                style={textareaStyle}
                placeholder="Describe how the factor should be applied."
              />
            </Field>

            <Field label="Assumptions">
              <textarea
                value={form.assumptions ?? ''}
                onChange={(e) => updateField('assumptions', e.target.value)}
                style={textareaStyle}
                placeholder="Document limitations, applicability, or review notes."
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => updateField('notes', e.target.value)}
                style={textareaStyle}
                placeholder="Optional reviewer notes"
              />
            </Field>
          </div>

          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={Boolean(form.verified)}
              onChange={(e) => updateField('verified', e.target.checked)}
            />
            Verified source and methodology
          </label>
          {form.activityType === 'WATER' ? (
            <div style={waterCustomFactorNoticeStyle}>
              Water is tracked only in CarbonLite pilot reporting and remains excluded from GHG totals by default.
            </div>
          ) : null}
        </div>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={!!form.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
          />
          Use as default factor for this activity type
        </label>

        <div style={{ marginTop: 18 }}>
          <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
            {submitting
              ? editingId
                ? 'Saving...'
                : 'Creating...'
              : editingId
              ? 'Save Changes'
              : 'Create Conversion Factor'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      )}

      {error ? <div className="no-print" style={errorStyle}>{error}</div> : null}
      {successMessage ? <div className="no-print" style={successStyle}>{successMessage}</div> : null}

      <div className="print-table-card" style={tableCardStyle}>
        <div style={tableHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Conversion Factor Library</h2>
            <p style={{ marginTop: 6, color: '#666' }}>
              Conversion factors should be current, source-backed, and jurisdiction-aware. CarbonLite tracks factor source, year, confidence level, and verification status to support more transparent calculations.
            </p>
          </div>
        </div>

        <form
          className="no-print conversion-factor-filters"
          style={filterBarStyle}
          onSubmit={(event) => {
            event.preventDefault();
            void loadItems();
          }}
        >
          <Field label="Activity Type">
            <select
              value={activityTypeFilter}
              onChange={(event) => setActivityTypeFilter(event.target.value)}
              style={inputStyle}
            >
              <option value="">All activity types</option>
              {activityTypes.map((type) => (
                <option key={type} value={type}>{getActivityTypeLabel(type)}</option>
              ))}
            </select>
          </Field>
          <Field label="Jurisdiction">
            <select
              value={jurisdictionFilter}
              onChange={(event) => setJurisdictionFilter(event.target.value)}
              style={inputStyle}
            >
              {JURISDICTION_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source Year">
            <input
              type="number"
              min="1900"
              max="2100"
              value={sourceYearFilter}
              onChange={(event) => setSourceYearFilter(event.target.value)}
              style={inputStyle}
              placeholder="e.g. 2025"
            />
          </Field>
          <Field label="Min Factor Value">
            <input
              type="number"
              step="any"
              value={minFactorValueFilter}
              onChange={(event) => setMinFactorValueFilter(event.target.value)}
              style={inputStyle}
              placeholder="e.g. 0.5"
            />
          </Field>
          <Field label="Max Factor Value">
            <input
              type="number"
              step="any"
              value={maxFactorValueFilter}
              onChange={(event) => setMaxFactorValueFilter(event.target.value)}
              style={inputStyle}
              placeholder="e.g. 3"
            />
          </Field>
          <Field label="Sort by Factor Value">
            <select
              value={factorValueSort}
              onChange={(event) => setFactorValueSort(event.target.value as 'none' | 'asc' | 'desc')}
              style={inputStyle}
            >
              <option value="none">Default order</option>
              <option value="asc">Lowest first</option>
              <option value="desc">Highest first</option>
            </select>
          </Field>
          <div className="conversion-factor-filter-actions" style={filterActionsStyle}>
            <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
              Apply Filters
            </button>
            <button
              type="button"
              style={filterClearButtonStyle}
              onClick={() => {
                setActivityTypeFilter('');
                setJurisdictionFilter('');
                setSourceYearFilter('');
                setMinFactorValueFilter('');
                setMaxFactorValueFilter('');
                setFactorValueSort('none');
                void loadItems({
                  activityType: '',
                  jurisdiction: '',
                  sourceYear: '',
                });
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {loading ? (
          <div style={{ padding: 16 }}>Loading conversion factors...</div>
        ) : (
          <>
          <div style={tableScrollHintStyle}>Scroll horizontally to view all columns →</div>
          <div style={factorTableWrapStyle}>
          <table style={factorTableStyle}>
            <colgroup>
              <col style={factorActivityTypeColStyle} />
              <col style={factorNameColStyle} />
              <col style={factorJurisdictionColStyle} />
              <col style={factorValueColStyle} />
              <col style={factorInputUnitColStyle} />
              <col style={factorSourceAuthorityColStyle} />
              <col style={factorSourceDocumentColStyle} />
              <col style={factorSourceYearColStyle} />
              <col style={factorVersionColStyle} />
              <col style={factorConfidenceColStyle} />
              <col style={factorVerificationColStyle} />
              <col style={factorAssumptionsColStyle} />
              <col style={factorTypeColStyle} />
              <col style={factorActionsColStyle} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Activity Type</th>
                <th style={thStyle}>Factor</th>
                <th style={thStyle}>Jurisdiction</th>
                <th style={thStyle}>Factor Value</th>
                <th style={thStyle}>Input Unit</th>
                <th style={thStyle}>Source Authority</th>
                <th style={thStyle}>Source Document</th>
                <th style={thStyle}>Source Year</th>
                <th style={thStyle}>Version</th>
                <th style={thStyle}>Confidence</th>
                <th style={thStyle}>Verification</th>
                <th style={thStyle}>Assumptions</th>
                <th style={thStyle}>Factor Type</th>
                <th className="no-print" style={stickyActionThStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ padding: 18, textAlign: 'center', color: '#666' }}>
                    No conversion factors yet.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const traceability = getFactorTraceability(item);

                  return (
                      <tr key={item.id} data-testid={`factor-row-${item.id}`}>
                        <td style={nowrapCellStyle}>{formatActivityTypeDisplay(item.activityType)}</td>
                        <td style={factorNameCellStyle}>
                          {formatFactorNameDisplay(item)}
                        </td>
                        <td style={nowrapCellStyle}>{traceability.jurisdiction}</td>
                        <td
                          style={factorValueCellStyle}
                          data-testid={`factor-value-${item.id}`}
                        >
                          {formatFactorValueDisplay(item)}
                        </td>
                        <td style={nowrapCellStyle}>{item.unit}</td>
                        <td style={sourceAuthorityCellStyle} title={traceability.sourceAuthority || undefined}>
                          {formatTableSourceAuthority(traceability.sourceAuthority)}
                        </td>
                        <td style={truncateCellStyle} title={traceability.sourceDocument || undefined}>
                          {traceability.sourceDocument || '-'}
                        </td>
                        <td style={nowrapCellStyle}>{traceability.sourceYear ?? '-'}</td>
                        <td style={nowrapCellStyle}>{traceability.factorVersion || '-'}</td>
                        <td style={truncateCellStyle} title={traceability.confidenceLevel || undefined}>
                          {traceability.confidenceLevel || '-'}
                        </td>
                        <td style={truncateCellStyle} title={traceability.verificationStatus || undefined}>
                          {traceability.verificationStatus || '-'}
                        </td>
                        <td style={truncateCellStyle} title={traceability.assumptions || undefined}>
                          {traceability.assumptions || '-'}
                        </td>
                        <td style={factorTypeCellStyle}>
                          {isSystemFactor(item) ? (
                            <span title={getFactorTypeLabel(item)}>
                              <Badge label={getFactorTypeTableLabel(item)} color="#1d4ed8" background="#dbeafe" />
                            </span>
                          ) : (
                            <span title={getFactorTypeLabel(item)}>
                              <Badge label={getFactorTypeTableLabel(item)} color="#047857" background="#dcfce7" />
                            </span>
                          )}
                        </td>
                        <td className="no-print" style={actionsCellStyle}>
                          <button
                            type="button"
                            onClick={() => setSelectedFactor(item)}
                            style={detailsButtonStyle}
                          >
                            View
                          </button>
                          <div style={overflowMenuWrapperStyle}>
                            <button
                              ref={(element) => {
                                actionMenuButtonRefs.current[item.id] = element;
                              }}
                              type="button"
                              aria-label={`More actions for ${item.name}`}
                              aria-haspopup="menu"
                              aria-expanded={openActionMenuId === item.id}
                              onClick={(event) => toggleActionMenu(item.id, event.currentTarget)}
                              style={overflowButtonStyle}
                            >
                              ⋮
                            </button>
                          </div>
                        </td>
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>

      <div className="print-report-footer" style={printFooterStyle}>
        <div>Generated by CarbonLite</div>
        <div>For environmental reporting reference</div>
      </div>

      {selectedFactor ? (
        <FactorDetailsModal
          item={selectedFactor}
          onClose={() => setSelectedFactor(null)}
        />
      ) : null}
      {renderActionMenuPortal()}
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  accent = '#111827',
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  accent?: string;
}) {
  return (
    <div style={summaryCardStyle}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ marginTop: 12, color: '#666', fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800, color: accent }}>
        {value}
      </div>
      <div style={{ marginTop: 8, color: '#777', fontSize: 13 }}>{subtitle}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block', fontWeight: 600 }}>
      <span style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Badge({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '2px 7px',
        fontSize: 11,
        fontWeight: 700,
        color,
        background,
      }}
    >
      {label}
    </span>
  );
}

function FactorDetailsModal({
  item,
  onClose,
}: {
  item: ConversionFactorItem;
  onClose: () => void;
}) {
  const traceability = getFactorTraceability(item);

  return (
    <div className="no-print" style={modalBackdropStyle} role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="factor-details-title"
        style={modalStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ color: '#047857', fontWeight: 700, fontSize: 13 }}>
              {formatActivityTypeDisplay(item.activityType)}
            </div>
            <h2 id="factor-details-title" style={{ margin: '4px 0 0' }}>{formatFactorNameDisplay(item)}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close factor details" style={modalCloseStyle}>
            ×
          </button>
        </div>
        <div style={modalBadgeRowStyle}>
          {isSystemFactor(item) ? (
            <Badge label={getFactorTypeLabel(item)} color="#1d4ed8" background="#dbeafe" />
          ) : (
            <Badge label={getFactorTypeLabel(item)} color="#047857" background="#dcfce7" />
          )}
          {traceability.verified ? (
            <Badge label="Verified" color="#047857" background="#dcfce7" />
          ) : (
            <Badge label="Internal Review Required" color="#b45309" background="#fef3c7" />
          )}
        </div>
        {isSystemFactor(item) ? (
          <div style={systemFactorNoticeStyle}>
            System factors are managed by CarbonLite and cannot be edited directly.
            {!traceability.verified
              ? ' This system factor is included for pilot validation and should be reviewed before regulatory, client-facing, or compliance reporting.'
              : ''}
          </div>
        ) : null}
        {isPilotDefaultFactor(item) ? (
          <div style={pilotReviewNoticeStyle}>
            Pilot-stage default factor. Replace with reviewed official or consultant-approved
            factor before formal reporting.
          </div>
        ) : null}
        <div style={traceabilityDetailsStyle}>
          <DetailSection title="Factor Summary">
            <DetailItem label="Factor Name" value={formatFactorNameDisplay(item)} />
            <DetailItem label="Activity Type" value={formatActivityTypeDisplay(item.activityType)} />
            <DetailItem label="Value" value={formatFactorValueDisplay(item)} />
            <DetailItem label="Activity Unit" value={item.unit} />
            <DetailItem label="Factor Unit" value={formatFactorResultUnitDisplay(item)} />
            <DetailItem label="Jurisdiction" value={traceability.jurisdiction} />
            <DetailItem label="Source Year" value={traceability.sourceYear} />
            <DetailItem label="Version" value={traceability.factorVersion} />
            <DetailItem label="Default Scope" value={defaultScopeForFactor(item)} />
            {isWaterTrackedFactor(item) ? (
              <DetailItem label="Calculation" value="Not calculated by default" />
            ) : null}
          </DetailSection>

          <DetailSection title="Source & Governance">
            <DetailItem label="Source Authority" value={traceability.sourceAuthority} />
            <DetailItem label="Source Document" value={traceability.sourceDocument} />
            <DetailItem label="Verification Status" value={traceability.verificationStatus} />
            <DetailItem label="Confidence Level" value={traceability.confidenceLevel} />
            <DetailItem
              label="Consultant Review"
              value={isScope3Factor(item) || isPilotDefaultFactor(item) ? 'Recommended before formal reporting' : 'Use documented review status'}
            />
            <DetailItem label="Factor Type" value={getFactorTypeLabel(item)} />
            <DetailItem
              label="Source URL"
              value={
                traceability.sourceUrl ? (
                  <a href={getSourceUrlHref(traceability.sourceUrl)} target="_blank" rel="noopener noreferrer">
                    {getSourceLinkLabel(traceability.sourceUrl, item)}
                  </a>
                ) : null
              }
            />
          </DetailSection>

          <DetailSection title="Assumptions / Review Notes">
            <DetailItem label="Assumptions" value={traceability.assumptions} />
            <DetailItem label="Review Guidance" value={formatModalReviewGuidance(item)} />
            <DetailItem label="Methodology Notes" value={formatMethodologyDisplay(item)} />
            <DetailItem label="Notes" value={formatNotesDisplay(item)} />
            <DetailItem
              label="Audit History"
              value={`Created: ${formatAuditDate(item.createdAt)}\nUpdated: ${formatAuditDate(item.updatedAt)}`}
            />
          </DetailSection>
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={cancelButtonStyle}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={detailSectionStyle}>
      <h3 style={detailSectionTitleStyle}>{title}</h3>
      <div style={detailSectionGridStyle}>{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
        {label}
      </div>
      <div style={detailValueStyle}>{isMissingDetailValue(value) ? 'Not specified' : value}</div>
    </div>
  );
}

function isMissingDetailValue(value: React.ReactNode) {
  return value === null || value === undefined || value === '';
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 24,
};

const printHeaderStyle: React.CSSProperties = {
  display: 'none',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 24,
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: '2px solid #0f172a',
};

const printFooterStyle: React.CSSProperties = {
  display: 'none',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 20,
  paddingTop: 10,
  borderTop: '1px solid #cbd5e1',
  color: '#475569',
  fontSize: 12,
};

const printButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #10b981',
  background: '#10b981',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 24,
};

const summaryCardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

const formCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 16,
  background: '#fff',
  padding: 20,
  marginBottom: 20,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const collapsedFormStyle: React.CSSProperties = {
  ...formCardStyle,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
};

const readOnlyNoticeStyle: React.CSSProperties = {
  ...formCardStyle,
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.5,
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};

const sourceSectionStyle: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 18,
  borderTop: '1px solid #e5e7eb',
};

const filterBarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))',
  alignItems: 'end',
  gap: 10,
  rowGap: 14,
  padding: '12px 16px 14px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
};

const filterActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 8,
  gridColumn: '1 / -1',
  justifySelf: 'start',
  whiteSpace: 'nowrap',
};

const pilotDisclaimerStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontWeight: 600,
};

const pilotCoverageNoteStyle: React.CSSProperties = {
  marginTop: -12,
  marginBottom: 20,
  padding: 10,
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1e40af',
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 88,
  resize: 'vertical',
};

const checkboxRowStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#444',
};

const waterCustomFactorNoticeStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1e40af',
  fontSize: 13,
  fontWeight: 700,
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    height: 42,
    padding: '0 16px',
    borderRadius: 10,
    border: 'none',
    background: disabled ? '#9ca3af' : '#10b981',
    color: '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const cancelButtonStyle: React.CSSProperties = {
  marginLeft: 10,
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  fontWeight: 700,
  cursor: 'pointer',
};

const filterClearButtonStyle: React.CSSProperties = {
  height: 42,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  fontWeight: 700,
  cursor: 'pointer',
};

const successStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
};

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
};

const tableCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 16,
  overflow: 'hidden',
  background: '#fff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: '1px solid #eee',
};

const tableScrollHintStyle: React.CSSProperties = {
  padding: '0 16px 8px',
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 700,
  textAlign: 'right',
};

const factorTableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  maxWidth: '100%',
  width: '100%',
  WebkitOverflowScrolling: 'touch',
};

const factorTableStyle: React.CSSProperties = {
  width: 'max-content',
  minWidth: 2560,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const factorActivityTypeColStyle: React.CSSProperties = { width: 180 };
const factorNameColStyle: React.CSSProperties = { width: 240 };
const factorJurisdictionColStyle: React.CSSProperties = { width: 180 };
const factorValueColStyle: React.CSSProperties = { width: 120 };
const factorInputUnitColStyle: React.CSSProperties = { width: 150 };
const factorSourceAuthorityColStyle: React.CSSProperties = { width: 180 };
const factorSourceDocumentColStyle: React.CSSProperties = { width: 220 };
const factorSourceYearColStyle: React.CSSProperties = { width: 120 };
const factorVersionColStyle: React.CSSProperties = { width: 120 };
const factorConfidenceColStyle: React.CSSProperties = { width: 220 };
const factorVerificationColStyle: React.CSSProperties = { width: 240 };
const factorAssumptionsColStyle: React.CSSProperties = { width: 260 };
const factorTypeColStyle: React.CSSProperties = { width: 170 };
const factorActionsColStyle: React.CSSProperties = { width: 160 };

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #ddd',
  color: '#475569',
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.25,
  whiteSpace: 'normal',
  overflowWrap: 'break-word',
};

const stickyActionBaseStyle: React.CSSProperties = {
  position: 'sticky',
  right: 0,
  zIndex: 4,
  background: '#fff',
  borderLeft: '1px solid #e2e8f0',
  boxShadow: '-8px 0 12px rgba(15, 23, 42, 0.08)',
  width: 160,
  minWidth: 160,
  maxWidth: 160,
};

const stickyActionThStyle: React.CSSProperties = {
  ...thStyle,
  ...stickyActionBaseStyle,
  zIndex: 5,
  background: '#f8fafc',
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderBottom: '1px solid #eee',
  verticalAlign: 'middle',
  fontSize: 13,
  lineHeight: 1.25,
};

const nowrapCellStyle: React.CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const factorValueCellStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#065f46',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 16,
  fontWeight: 900,
  letterSpacing: 0,
};

const factorNameCellStyle: React.CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: 700,
};

const sourceAuthorityCellStyle: React.CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#475569',
};

const truncateCellStyle: React.CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#475569',
};

const factorTypeCellStyle: React.CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const actionsCellStyle: React.CSSProperties = {
  ...tdStyle,
  ...stickyActionBaseStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const overflowMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const overflowButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  fontSize: 20,
  lineHeight: 1,
  fontWeight: 800,
  cursor: 'pointer',
};

const overflowMenuStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 38,
  zIndex: 30,
  minWidth: 130,
  padding: 6,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
};

const lockedMenuLabelStyle: React.CSSProperties = {
  padding: '7px 9px',
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
};

function menuItemButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    padding: '8px 9px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: disabled ? '#9ca3af' : '#0f172a',
    textAlign: 'left',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function menuItemDangerStyle(disabled: boolean): React.CSSProperties {
  return {
    ...menuItemButtonStyle(disabled),
    color: disabled ? '#9ca3af' : '#dc2626',
  };
}

const detailsButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const traceabilityDetailsStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
};

const modalBadgeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 12,
};

const systemFactorNoticeStyle: React.CSSProperties = {
  border: '1px solid #bfdbfe',
  borderRadius: 8,
  background: '#eff6ff',
  color: '#1e40af',
  padding: '10px 12px',
  marginBottom: 14,
  fontSize: 13,
  fontWeight: 700,
};

const pilotReviewNoticeStyle: React.CSSProperties = {
  border: '1px solid #bfdbfe',
  borderRadius: 8,
  background: '#eff6ff',
  color: '#1e40af',
  padding: '10px 12px',
  marginBottom: 14,
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 700,
};

const detailSectionStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 14,
  background: '#fff',
};

const detailSectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: '#0f172a',
  fontSize: 14,
};

const detailSectionGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
};

const detailValueStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#0f172a',
  whiteSpace: 'pre-line',
  overflowWrap: 'anywhere',
  lineHeight: 1.45,
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'rgba(15, 23, 42, 0.48)',
};

const modalStyle: React.CSSProperties = {
  width: 'min(760px, 100%)',
  maxHeight: '85vh',
  overflowY: 'auto',
  padding: 24,
  borderRadius: 8,
  background: '#fff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.24)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 20,
  paddingBottom: 16,
  borderBottom: '1px solid #e2e8f0',
};

const modalCloseStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  color: '#334155',
  fontSize: 24,
  lineHeight: 1,
  cursor: 'pointer',
};

const printStyles = `
  .print-report-header,
  .print-report-footer,
  .print-only-table-cell {
    display: none;
  }

  @media print {
    @page {
      size: landscape;
      margin: 12mm;
    }

    body {
      background: #fff !important;
      color: #0f172a !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body * {
      visibility: hidden;
    }

    .conversion-factors-page,
    .conversion-factors-page * {
      visibility: visible;
    }

    .conversion-factors-page {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 11px;
    }

    .no-print,
    .no-print * {
      display: none !important;
      visibility: hidden !important;
    }

    .print-report-header,
    .print-report-footer {
      display: flex !important;
      visibility: visible !important;
    }

    .print-only-table-cell {
      display: table-cell !important;
    }

    .print-table-card {
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
    }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: auto;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    th,
    td {
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      vertical-align: top !important;
      font-size: 10px !important;
    }

    th {
      background: #e2e8f0 !important;
      color: #0f172a !important;
      font-weight: 800 !important;
    }
  }
`;

const responsiveStyles = `
  @media (max-width: 1120px) {
    .conversion-factor-filters {
      grid-template-columns: repeat(3, minmax(150px, 1fr)) !important;
    }
  }

  @media (max-width: 680px) {
    .conversion-factor-filters {
      grid-template-columns: 1fr !important;
    }

    .conversion-factor-filter-actions {
      flex-wrap: wrap !important;
    }
  }
`;
