import {
  generatePaygovTrackingId,
  paygovTrackingIdRegex,
} from './generatePaygovTrackingId';

describe('PaygovTrackingId', () => {
  describe('generatePaygovTrackingId', () => {
    it('should return a 21-character string', () => {
      const id = generatePaygovTrackingId();
      expect(id).toHaveLength(21);
    });

    it('should only contain alphanumeric characters and spaces', () => {
      const id = generatePaygovTrackingId();
      expect(id).toMatch(/^[A-Za-z0-9 ]{21}$/);
    });

    it('should return unique values on successive calls', () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => generatePaygovTrackingId())
      );
      expect(ids.size).toBe(100);
    });
  });

  describe('paygovTrackingIdRegex', () => {
    it('should match valid tracking IDs', () => {
      expect('A1b2C3d4E5f6G7h8I9j0K').toMatch(paygovTrackingIdRegex);
      expect('123456789012345678901').toMatch(paygovTrackingIdRegex);
      expect('ABCDEFGHIJKLMNOPQRSTU').toMatch(paygovTrackingIdRegex);
      expect('abc def ghi jkl mno p').toMatch(paygovTrackingIdRegex);
    });

    it('should not match invalid tracking IDs', () => {
      expect('A1b2C3d4E5f6G7h8I9j0K!').not.toMatch(paygovTrackingIdRegex);
      expect('12345678901234567890').not.toMatch(paygovTrackingIdRegex); // 20 characters
      expect('ABCDEFGHIJKLMNOPQRSTUV').not.toMatch(paygovTrackingIdRegex); // 22 characters
      expect('abcdefghi').not.toMatch(paygovTrackingIdRegex); // 9 characters
      expect('abc-def-ghi-jkl-mno-pqr').not.toMatch(paygovTrackingIdRegex); // contains hyphens
    });
  });
});
