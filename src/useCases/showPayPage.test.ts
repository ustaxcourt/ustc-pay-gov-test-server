import { showPayPage } from "../useCases/showPayPage";
import { load } from "cheerio";
import fs from "fs";
import path from "path";

describe("showPayPage", () => {
  it("renders HTML with all links and correct data attributes", async () => {
    const payHtmlPath = path.join(__dirname, "../static/html/pay.html");
    const payHtml = fs.readFileSync(payHtmlPath, "utf-8");

    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction: jest.fn().mockResolvedValue({
          url_success: "http://example.com/success",
          url_cancel: "https://example.com/cancel",
        }),
      }),
      storageClient: () => ({
        getFile: jest.fn().mockResolvedValue(payHtml),
      }),
    } as unknown as Parameters<typeof showPayPage>[0];

    const html = await showPayPage(appContext, { token: "tok" });

    const $ = load(html);
    const links = $("a");

    // PAYPAL Success, PLASTIC_CARD Success, ACH Success, PLASTIC_CARD Failed, ACH Failed, PAYPAL Failed, Cancel
    expect(links).toHaveLength(7);

    const paypalSuccess = $(
      'a[data-payment-method="PAYPAL"][data-payment-status="Success"]',
    );
    expect(paypalSuccess.length).toBe(1);
    expect(paypalSuccess.attr("href")).toBe("http://example.com/success");
    expect(paypalSuccess.text()).toContain(
      "Complete Payment (PayPal - Success)",
    );

    const cardSuccess = $(
      'a[data-payment-method="PLASTIC_CARD"][data-payment-status="Success"]',
    );
    expect(cardSuccess.length).toBe(1);
    expect(cardSuccess.attr("href")).toBe("http://example.com/success");
    expect(cardSuccess.text()).toContain(
      "Complete Payment (Credit Card - Success)",
    );

    const achSuccess = $(
      'a[data-payment-method="ACH"][data-payment-status="Success"]',
    );
    expect(achSuccess.length).toBe(1);
    expect(achSuccess.attr("href")).toBe("http://example.com/success");
    expect(achSuccess.text()).toContain("Complete Payment (ACH - Success)");

    const cardFailed = $(
      'a[data-payment-method="PLASTIC_CARD"][data-payment-status="Failed"]',
    );
    expect(cardFailed.length).toBe(1);
    expect(cardFailed.attr("href")).toBe("http://example.com/success");
    expect(cardFailed.text()).toContain(
      "Complete Payment (Credit Card - Failed)",
    );

    const achFailed = $(
      'a[data-payment-method="ACH"][data-payment-status="Failed"]',
    );
    expect(achFailed.length).toBe(1);
    expect(achFailed.attr("href")).toBe("http://example.com/success");
    expect(achFailed.text()).toContain("Complete Payment (ACH - Failed)");

    const paypalFailed = $(
      'a[data-payment-method="PAYPAL"][data-payment-status="Failed"]',
    );
    expect(paypalFailed.length).toBe(1);
    expect(paypalFailed.attr("href")).toBe("http://example.com/success");
    expect(paypalFailed.text()).toContain("Complete Payment (PayPal - Failed)");

    const cancelLink = $('a[href="https://example.com/cancel"]');
    expect(cancelLink.length).toBe(1);
    expect(cancelLink.text()).toContain("Cancel Payment");
  });
});
