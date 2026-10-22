import { escapeCsvValue, neutralizeSpreadsheetText } from './csv';

// Dangerous text is quoted even when it has no CSV delimiters. Numbers remain numbers.
describe('spreadsheet-safe CSV serialization', () => {
  it.each([
    '=SUM(1,2)', '+SUM(1,2)', '-CMD(...)', '-1+2', '@SUM(1,2)',
    '=cmd|anything', '=HYPERLINK("https://example.com?a=1,b=2","Click")',
    '\t=SUM(1,2)', '\r=SUM(1,2)', '\n=SUM(1,2)', '   =SUM(1,2)',
    ' \t\r+SUM(1,2)', '\u0000=1+1', '＝SUM(1,2)', '＋1+1', '－1+2', '＠SUM(1,2)',
    '=SUM(1,2)\nsecond line', '=1+2";=1+2', '-123', '+12',
    '\tordinary text', '\rordinary text',
  ])('neutralizes text %j before escaping its CSV syntax', text => {
    expect(neutralizeSpreadsheetText(text)).toBe(`'${text}`);
    expect(escapeCsvValue(text)).toBe(`"'${text.replace(/"/g, '""')}"`);
  });

  it.each(['Calgary Facility', 'Diesel - Fleet', 'Source #123', 'A+B Energy', '00123', '  ordinary text  ', "'=1+1"])(
    'leaves harmless text %j unchanged', text => {
      expect(neutralizeSpreadsheetText(text)).toBe(text);
      expect(escapeCsvValue(text)).toBe(text);
    },
  );

  it.each([-1, -1.5, -1000.25, -25, -25.5, 0, 1, 1.5, 1000.25, 25.5])(
    'preserves typed numeric value %s', value => expect(escapeCsvValue(value)).toBe(String(value)),
  );

  it.each(['-1', '-1.5', '-1000.25', '+12', '579.40', '2428.44', '3007.84', '808.50', '115.50', '268.00'])(
    'preserves schema-declared numeric string %s exactly', value => expect(escapeCsvValue(value, 'number')).toBe(value),
  );

  it.each([
    ['-1,000.25', '"-1,000.25"'], ['-1.000.000,25', '"-1.000.000,25"'],
    ['-1\u00a0000,25', '"-1\u00a0000,25"'], ['-1\u202f000.25', '-1\u202f000.25'],
  ])('preserves existing localized numeric display %j', (input, expected) => {
    expect(escapeCsvValue(input, 'number')).toBe(expected);
  });

  it.each(['-1+2', '=1+1', '+CMD()', '@SUM(1,2)', '\t=1+1'])(
    'protects invalid data even in a numeric column: %j', value => {
      expect(escapeCsvValue(value, 'number')).toBe(escapeCsvValue(value, 'text'));
    },
  );

  it.each([
    ['hello,world', '"hello,world"'], ['He said "hello"', '"He said ""hello"""'],
    ['line 1\nline 2', '"line 1\nline 2"'], ['line 1\rline 2', '"line 1\rline 2"'],
    [null, ''], [undefined, ''],
  ])('retains CSV escaping for %j', (input, expected) => expect(escapeCsvValue(input)).toBe(expected));
});
