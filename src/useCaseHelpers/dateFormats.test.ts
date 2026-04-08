import { isoDateTimeRegex, yyyyMmDdRegex } from './dateFormats';

describe('dateFormats', () => {
  describe('isoDateTimeRegex', () => {
    it('matches valid ISO datetime values', () => {
      expect('2026-04-07T12:00:00Z').toMatch(isoDateTimeRegex);
      expect('2026-04-07T12:00:00.123Z').toMatch(isoDateTimeRegex);
      expect('2026-04-07T12:00:00+00:00').toMatch(isoDateTimeRegex);
      expect('2026-04-07T12:00:00-05:00').toMatch(isoDateTimeRegex);
    });

    it('does not match invalid ISO datetime values', () => {
      expect('2026-04-07').not.toMatch(isoDateTimeRegex);
      expect('2026-04-07 12:00:00Z').not.toMatch(isoDateTimeRegex);
      expect('2026-04-07T12:00Z').not.toMatch(isoDateTimeRegex);
      expect('04-07-2026T12:00:00Z').not.toMatch(isoDateTimeRegex);
    });
  });

  describe('yyyyMmDdRegex', () => {
    it('matches valid YYYY-MM-DD values', () => {
      expect('2026-04-07').toMatch(yyyyMmDdRegex);
      expect('1999-12-31').toMatch(yyyyMmDdRegex);
    });

    it('does not match invalid YYYY-MM-DD values', () => {
      expect('2026-4-7').not.toMatch(yyyyMmDdRegex);
      expect('2026/04/07').not.toMatch(yyyyMmDdRegex);
      expect('2026-04-07T12:00:00Z').not.toMatch(yyyyMmDdRegex);
      expect('04-07-2026').not.toMatch(yyyyMmDdRegex);
    });
  });
});
