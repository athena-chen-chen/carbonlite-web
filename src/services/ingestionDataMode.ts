export type IngestionDataMode = 'SYNTHETIC_TEST' | 'REAL_CUSTOMER_DATA';

let currentMode: IngestionDataMode = 'SYNTHETIC_TEST';

export function setIngestionDataMode(mode: IngestionDataMode) {
  currentMode = mode;
}

export function resetIngestionDataMode() {
  currentMode = 'SYNTHETIC_TEST';
}

export function ingestionDataModeHeader() {
  return { 'X-CarbonLite-Data-Mode': currentMode };
}
