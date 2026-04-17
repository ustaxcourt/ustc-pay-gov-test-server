import { DateTime } from "luxon";
import { ACH_THRESHOLD_SECONDS, resolveTransactionStatus } from "./resolveTransactionStatus";
import { InitiatedTransaction } from "../types/Transaction";

const baseTransaction: InitiatedTransaction = {
  token: "tok",
  agency_tracking_id: "aid",
  tcp_appid: "appid",
  transaction_amount: "10.00",
  url_success: "https://success",
  url_cancel: "https://cancel",
};

describe("resolveTransactionStatus", () => {
  describe("PLASTIC_CARD with no flags", () => {
    it("returns Success", () => {
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PLASTIC_CARD",
      });
      expect(result).toBe("Success");
    });
  });

  describe("non-ACH failed_payment flag", () => {
    it("returns Failed immediately for PLASTIC_CARD", () => {
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PLASTIC_CARD",
        failed_payment: true,
      });
      expect(result).toBe("Failed");
    });
  });

  describe(`ACH within ${ACH_THRESHOLD_SECONDS} seconds`, () => {
    it("returns Received", () => {
      const achInitiatedAt = DateTime.now()
        .minus({ seconds: ACH_THRESHOLD_SECONDS - 5 })
        .toJSDate()
        .toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
      });
      expect(result).toBe("Received");
    });
  });

  describe(`ACH at exactly ${ACH_THRESHOLD_SECONDS} seconds`, () => {
    it("returns Success", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: ACH_THRESHOLD_SECONDS }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
      });
      expect(result).toBe("Success");
    });
  });

  describe(`ACH after ${ACH_THRESHOLD_SECONDS} seconds`, () => {
    it("returns Success", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: ACH_THRESHOLD_SECONDS + 1 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
      });
      expect(result).toBe("Success");
    });
  });

  describe(`ACH failed within ${ACH_THRESHOLD_SECONDS} seconds`, () => {
    it("returns Received", () => {
      const achInitiatedAt = DateTime.now()
        .minus({ seconds: ACH_THRESHOLD_SECONDS - 5 })
        .toJSDate()
        .toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
        failed_payment: true,
      });
      expect(result).toBe("Received");
    });
  });

  describe(`ACH failed at exactly ${ACH_THRESHOLD_SECONDS} seconds`, () => {
    it("returns Failed", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: ACH_THRESHOLD_SECONDS }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
        failed_payment: true,
      });
      expect(result).toBe("Failed");
    });
  });

  describe(`ACH failed after ${ACH_THRESHOLD_SECONDS} seconds`, () => {
    it("returns Failed", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: ACH_THRESHOLD_SECONDS + 1 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
        failed_payment: true,
      });
      expect(result).toBe("Failed");
    });
  });

  describe("ACH with no ach_initiated_at and no flags", () => {
    it("returns Success", () => {
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
      });
      expect(result).toBe("Success");
    });
  });
});
