import { markPaymentFailedLambda } from './markPaymentFailedLambda';
import { InvalidRequestError } from '../errors/InvalidRequestError';
import type { Request, Response } from 'express';
import * as handleErrorModule from './handleError';

describe('markPaymentFailedLambda', () => {
  type MockResponse = {
    status: jest.Mock;
    send: jest.Mock;
    locals: {
      appContext: {
        useCases: () => {
          handleMarkPaymentFailed: jest.Mock;
        };
      };
    };
  };

  let req: Partial<Request>;
  let res: MockResponse;

  beforeEach(() => {
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      locals: {
        appContext: {
          useCases: () => ({
            handleMarkPaymentFailed: jest.fn().mockResolvedValue(undefined),
          }),
        },
      },
    };
  });

  it('returns 200 and ok when token is provided', async () => {
    req.query!.token = 'tok';
    await markPaymentFailedLambda(req as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('returns 400 if token is missing', async () => {
    const spy = jest
      .spyOn(handleErrorModule, 'handleLocalError')
      .mockImplementation((...args: unknown[]) => {
        const error = args[0];
        const response = args[1] as MockResponse;
        const errorMessage = error instanceof Error ? error.message : String(error);
        response.status(400).send(errorMessage);
      });
    await markPaymentFailedLambda(req as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('No token found');
    spy.mockRestore();
  });

  it('returns error if use case throws', async () => {
    req.query!.token = 'tok';
    res.locals.appContext.useCases = () => ({
      handleMarkPaymentFailed: jest.fn().mockRejectedValue(new InvalidRequestError('already failed')),
    });
    const spy = jest
      .spyOn(handleErrorModule, 'handleLocalError')
      .mockImplementation((...args: unknown[]) => {
        const error = args[0];
        const response = args[1] as MockResponse;
        const errorMessage = error instanceof Error ? error.message : String(error);
        response.status(400).send(errorMessage);
      });
    await markPaymentFailedLambda(req as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('already failed');
    spy.mockRestore();
  });
});
