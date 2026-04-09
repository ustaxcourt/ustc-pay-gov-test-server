
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
          url_success: 'success',
          url_cancel: 'cancel',
        }),
      }),
      storageClient: () => ({
        getFile: jest.fn().mockResolvedValue(payHtml),
      }),
    } as unknown as Parameters<typeof showPayPage>[0];

    const html = await showPayPage(appContext, { token: 'tok' });

    // Normalize whitespace for robust matching
    const normalizedHtml = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

    // There should be 4 anchor tags
    const anchorMatches = normalizedHtml.match(/<a [^>]*>/g);
    expect(anchorMatches).not.toBeNull();
    expect(anchorMatches!.length).toBe(4);

    // Check the first three links for data attributes and href (attribute order agnostic)
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="success"[^>]*data-payment-method="PLASTIC_CARD"[^>]*data-payment-status="Success"[^>]*>Complete Payment<\/a>/
    );
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="success"[^>]*data-payment-method="ACH"[^>]*data-payment-status="Success"[^>]*>Complete Payment \(ACH - Success\)<\/a>/
    );
    expect(normalizedHtml).toMatch(
      /<a[^>]*href="success"[^>]*data-payment-method="PLASTIC_CARD"[^>]*data-payment-status="Failed"[^>]*>Complete Payment \(Credit Card - Failed\)<\/a>/
    );

    // The fourth link is cancel
    expect(normalizedHtml).toMatch(/<a href="cancel">Cancel Payment<\/a>/);
  });

  it('throws if token is missing', async () => {
    const appContext = {} as unknown as Parameters<typeof showPayPage>[0];
    await expect(showPayPage(appContext, { token: '' })).rejects.toThrow(
      new InvalidRequestError('Token not found')
    );
  });
});
