import { showPayPage } from '../useCases/showPayPage';

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
        getFile: jest.fn().mockResolvedValue('<html>%%urlSuccess%% %%urlCancel%% %%token%%</html>'),
      }),
    } as unknown as Parameters<typeof showPayPage>[0];
    const html = await showPayPage(appContext, { token: 'tok' });
    expect(html).toBe('<html>success cancel tok</html>');
  });

  it('throws if token is missing', async () => {
    const appContext = {} as unknown as Parameters<typeof showPayPage>[0];
    await expect(showPayPage(appContext, { token: '' })).rejects.toBe('Token not found');
  });
});
