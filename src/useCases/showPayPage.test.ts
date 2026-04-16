
import { showPayPage } from '../useCases/showPayPage';
import { InvalidRequestError } from '../errors/InvalidRequestError';
import fs from 'fs';
import path from 'path';


describe('showPayPage', () => {
  it('renders HTML with all links and correct data attributes', async () => {
    const payHtmlPath = path.join(__dirname, '../static/html/pay.html');
    const payHtml = fs.readFileSync(payHtmlPath, 'utf-8');

    const appContext = {
      persistenceGateway: () => ({
        getInitiatedTransaction: jest.fn().mockResolvedValue({
          url_success: 'http://example.com/success',
          url_cancel: 'https://example.com/cancel',
        }),
      }),
      storageClient: () => ({
        getFile: jest.fn().mockResolvedValue(payHtml),
      }),
    } as unknown as Parameters<typeof showPayPage>[0];

    const html = await showPayPage(appContext, { token: 'tok' });

    // Normalize whitespace for robust matching
    const normalizedHtml = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

    // There should be 5 anchor tags
    const anchorMatches = normalizedHtml.match(/<a [^>]*>/g);
    expect(anchorMatches).not.toBeNull();
    expect(anchorMatches!.length).toBe(5);

    // Check the first four links for data attributes and href (attribute order agnostic)
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="http:\/\/example.com\/success"[^>]*data-payment-method="PLASTIC_CARD"[^>]*data-payment-status="Success"[^>]*>Complete Payment<\/a>/
    );
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="http:\/\/example.com\/success"[^>]*data-payment-method="ACH"[^>]*data-payment-status="Success"[^>]*>Complete Payment \(ACH - Success\)<\/a>/
    );
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="http:\/\/example.com\/success"[^>]*data-payment-method="PLASTIC_CARD"[^>]*data-payment-status="Failed"[^>]*>Complete Payment \(Credit Card - Failed\)<\/a>/
    );
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="http:\/\/example.com\/success"[^>]*data-payment-method="ACH"[^>]*data-payment-status="Failed"[^>]*>Complete Payment \(ACH - Failed\)<\/a>/
    );

    // The fifth link is cancel
    expect(normalizedHtml).toMatch(/<a href="https:\/\/example.com\/cancel">Cancel Payment<\/a>/);
  });
});
