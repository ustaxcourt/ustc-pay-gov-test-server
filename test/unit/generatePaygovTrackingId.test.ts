import { generatePaygovTrackingId } from "../../src/useCaseHelpers/generatePaygovTrackingId";

describe("generatePaygovTrackingId", () => {
  it("should return a 21-character string", () => {
    const id = generatePaygovTrackingId();
    expect(id).toHaveLength(21);
  });

  it("should only contain alphanumeric characters", () => {
    const id = generatePaygovTrackingId();
    expect(id).toMatch(/^[A-Za-z0-9]{21}$/);
  });

  it("should return unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePaygovTrackingId()));
    expect(ids.size).toBe(100);
  });
});
