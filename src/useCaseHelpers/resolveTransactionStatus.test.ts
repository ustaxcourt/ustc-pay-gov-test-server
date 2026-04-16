import { DateTime } from "luxon";
import { resolveTransactionStatus } from "./resolveTransactionStatus";
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

  describe("failed_payment flag", () => {
    it("returns Failed regardless of payment type", () => {
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PLASTIC_CARD",
        failed_payment: true,
      });
      expect(result).toBe("Failed");
    });
  });

  describe("ACH within 15 seconds", () => {
    it("returns Received", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: 5 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
      });
      expect(result).toBe("Received");
    });
  });

  describe("ACH at exactly 15 seconds", () => {
    it("returns Success", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: 15 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
      });
      expect(result).toBe("Success");
    });
  });

  describe("ACH after 15 seconds", () => {
    it("returns Success", () => {
      const achInitiatedAt = DateTime.now().minus({ seconds: 16 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
        ach_initiated_at: achInitiatedAt,
      });
      expect(result).toBe("Success");
    });
  });

  describe("ACH with no ach_initiated_at", () => {
    it("returns Success (ACH marked failed path, ach_initiated_at never set)", () => {
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "ACH",
      });
      expect(result).toBe("Success");
    });
  });

  describe("PAYPAL within 15 seconds", () => {
    it("returns Received", () => {
      const paypalInitiatedAt = DateTime.now().minus({ seconds: 5 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PAYPAL",
        paypal_initiated_at: paypalInitiatedAt,
      });
      expect(result).toBe("Received");
    });
  });

  describe("PAYPAL at exactly 15 seconds", () => {
    it("returns Success", () => {
      const paypalInitiatedAt = DateTime.now().minus({ seconds: 15 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PAYPAL",
        paypal_initiated_at: paypalInitiatedAt,
      });
      expect(result).toBe("Success");
    });
  });

  describe("PAYPAL after 15 seconds", () => {
    it("returns Success", () => {
      const paypalInitiatedAt = DateTime.now().minus({ seconds: 16 }).toJSDate().toISOString();
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PAYPAL",
        paypal_initiated_at: paypalInitiatedAt,
      });
      expect(result).toBe("Success");
    });
  });

  describe("PAYPAL with no paypal_initiated_at", () => {
    it("returns Success (PAYPAL marked failed path, paypal_initiated_at never set)", () => {
      const result = resolveTransactionStatus({
        ...baseTransaction,
        payment_type: "PAYPAL",
      });
      expect(result).toBe("Success");
    });
  });
});
