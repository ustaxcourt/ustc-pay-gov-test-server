
import { showPayPage } from '../useCases/showPayPage';
import '@testing-library/jest-dom';
import { JSDOM } from 'jsdom';
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

    const document = new JSDOM(html).window.document;
    const links = document.querySelectorAll('a');

    // PAYPAL Success, PLASTIC_CARD Success, ACH Success, PLASTIC_CARD Failed, ACH Failed, PAYPAL Failed, Cancel
    expect(links).toHaveLength(7);

    const paypalSuccess = document.querySelector(
      'a[data-payment-method="PAYPAL"][data-payment-status="Success"]',
    );
    expect(paypalSuccess).toBeInTheDocument();
    expect(paypalSuccess).toHaveAttribute('href', 'http://example.com/success');
    expect(paypalSuccess).toHaveTextContent('Complete Payment (PAYPAL - Success)');

    const cardSuccess = document.querySelector(
      'a[data-payment-method="PLASTIC_CARD"][data-payment-status="Success"]',
    );
    expect(cardSuccess).toBeInTheDocument();
    expect(cardSuccess).toHaveAttribute('href', 'http://example.com/success');
    expect(cardSuccess).toHaveTextContent('Complete Payment (Credit Card - Success)');

    const achSuccess = document.querySelector(
      'a[data-payment-method="ACH"][data-payment-status="Success"]',
    );
    expect(achSuccess).toBeInTheDocument();
    expect(achSuccess).toHaveAttribute('href', 'http://example.com/success');
    expect(achSuccess).toHaveTextContent('Complete Payment (ACH - Success)');

    const cardFailed = document.querySelector(
      'a[data-payment-method="PLASTIC_CARD"][data-payment-status="Failed"]',
    );
    expect(cardFailed).toBeInTheDocument();
    expect(cardFailed).toHaveAttribute('href', 'http://example.com/success');
    expect(cardFailed).toHaveTextContent('Complete Payment (Credit Card - Failed)');

    const achFailed = document.querySelector(
      'a[data-payment-method="ACH"][data-payment-status="Failed"]',
    );
    expect(achFailed).toBeInTheDocument();
    expect(achFailed).toHaveAttribute('href', 'http://example.com/success');
    expect(achFailed).toHaveTextContent('Complete Payment (ACH - Failed)');

    const paypalFailed = document.querySelector(
      'a[data-payment-method="PAYPAL"][data-payment-status="Failed"]',
    );
    expect(paypalFailed).toBeInTheDocument();
    expect(paypalFailed).toHaveAttribute('href', 'http://example.com/success');
    expect(paypalFailed).toHaveTextContent('Complete Payment (PAYPAL - Failed)');

    const cancelLink = document.querySelector('a[href="https://example.com/cancel"]');
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink).toHaveTextContent('Cancel Payment');
  });
});
