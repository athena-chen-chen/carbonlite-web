import {
  ingestionDataModeHeader,
  resetIngestionDataMode,
  setIngestionDataMode,
} from './ingestionDataMode';

describe('ingestion data mode', () => {
  afterEach(resetIngestionDataMode);

  it('defaults fail-safe to explicit synthetic/test mode', () => {
    expect(ingestionDataModeHeader()).toEqual({
      'X-CarbonLite-Data-Mode': 'SYNTHETIC_TEST',
    });
  });

  it('marks explicitly acknowledged real-customer-data ingestion', () => {
    setIngestionDataMode('REAL_CUSTOMER_DATA');
    expect(ingestionDataModeHeader()).toEqual({
      'X-CarbonLite-Data-Mode': 'REAL_CUSTOMER_DATA',
    });
  });
});
