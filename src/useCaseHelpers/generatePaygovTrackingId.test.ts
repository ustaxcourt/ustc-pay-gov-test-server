import {
  generatePaygovTrackingId,
  paygovTrackingIdRegex,
} from "./generatePaygovTrackingId";

describe("PaygovTrackingId", () => {
  describe("generatePaygovTrackingId", () => {
    let payGovTrackingIds = new Set<string>();

    beforeAll(() => {
      for (let i = 0; i < 1000; i++) {
        const id = generatePaygovTrackingId();
        payGovTrackingIds.add(id);
      }
    });

    it("should return a 21-character string", () => {
      expect(payGovTrackingIds.size).toBe(1000); // Ensure all generated IDs are unique
      for (const id of payGovTrackingIds) {
        expect(id).toHaveLength(21);
      }
    });

    it("should only contain alphanumeric characters and spaces", () => {
      for (const id of payGovTrackingIds) {
        expect(id).toMatch(paygovTrackingIdRegex);
      }
    });

    it("should return unique values on successive calls", () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => generatePaygovTrackingId()),
      );
      expect(ids.size).toBe(100);
    });

    it("should not start or end with a space", () => {
      for (const id of payGovTrackingIds) {
        expect(id[0]).not.toBe(" ");
        expect(id[id.length - 1]).not.toBe(" ");
      }
    });
  });

  describe("paygovTrackingIdRegex", () => {
    it("should match valid tracking IDs", () => {
      expect("A1b2C3d4E5f6G7h8I9j0K").toMatch(paygovTrackingIdRegex);
      expect("123456789012345678901").toMatch(paygovTrackingIdRegex);
      expect("ABCDEFGHIJKLMNOPQRSTU").toMatch(paygovTrackingIdRegex);
      expect("abc def ghi jkl mno p").toMatch(paygovTrackingIdRegex);
    });

    it("should not match invalid tracking IDs", () => {
      expect("A1b2C3d4E5f6G7h8I9j0K!").not.toMatch(paygovTrackingIdRegex);
      expect("12345678901234567890").not.toMatch(paygovTrackingIdRegex); // 20 characters
      expect("ABCDEFGHIJKLMNOPQRSTUV").not.toMatch(paygovTrackingIdRegex); // 22 characters
      expect("abcdefghi").not.toMatch(paygovTrackingIdRegex); // 9 characters
      expect("abc-def-ghi-jkl-mno-pqr").not.toMatch(paygovTrackingIdRegex); // contains hyphens
      expect(" abcdefghi").not.toMatch(paygovTrackingIdRegex);
      expect("abcdefghi ").not.toMatch(paygovTrackingIdRegex);
    });
  });
});
