import {
  generatePaygovTrackingId,
  paygovTrackingIdRegex,
} from "./generatePaygovTrackingId";

describe("PaygovTrackingId", () => {
  describe("generatePaygovTrackingId", () => {
    const NUMBER_OF_TEST_IDS = 70000;
    let payGovTrackingIds = new Set<string>();

    beforeAll(() => {
      for (let i = 0; i < NUMBER_OF_TEST_IDS; i++) {
        const id = generatePaygovTrackingId();
        payGovTrackingIds.add(id);
      }
    });

    afterAll(() => {
      payGovTrackingIds.clear();
    });

    it("should only contain alphanumeric characters and spaces", () => {
      for (const id of payGovTrackingIds) {
        expect(id).toMatch(paygovTrackingIdRegex);
      }
    });

    it("should return unique values on successive calls", () => {
      expect(payGovTrackingIds.size).toBe(NUMBER_OF_TEST_IDS); // Ensure all generated IDs are unique
      for (const id of payGovTrackingIds) {
        expect(id).toHaveLength(21);
      }
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
      expect(` ${"A".repeat(20)}`).not.toMatch(paygovTrackingIdRegex);
      expect(`${"A".repeat(20)} `).not.toMatch(paygovTrackingIdRegex);
    });
  });
});
