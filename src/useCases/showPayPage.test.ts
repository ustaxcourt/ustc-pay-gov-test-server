import { showPayPage } from '../useCases/showPayPage';
import { InvalidRequestError } from '../errors/InvalidRequestError';

describe('showPayPage', () => {
  it('returns rendered HTML with replacements', async () => {
    const appContext = {
      persistenceGateway: () => ({
        getTransactionRequest: jest.fn().mockResolvedValue({
          url_success: 'success',
          url_cancel: 'cancel',
        }),
      }),
      storageClient: () => ({
        getFile: jest.fn().mockResolvedValue('<html>%%urlSuccess%% %%urlCancel%%</html>'),
      }),
    } as unknown as Parameters<typeof showPayPage>[0];

    const html = await showPayPage(appContext, { token: 'tok' });

    expect(html).toBe('<html>success cancel</html>');
    expect(html).not.toContain('tok');
  });

  it('throws if token is missing', async () => {
    const appContext = {} as unknown as Parameters<typeof showPayPage>[0];

    await expect(showPayPage(appContext, { token: '' })).rejects.toThrow(
      new InvalidRequestError('Token not found')
    );
  });
});
