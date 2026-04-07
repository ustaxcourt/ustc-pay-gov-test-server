import { getScriptLocal } from './getScriptLambda';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

describe('getScriptLocal', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let sendSpy: jest.Mock;
  let setHeaderSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    sendSpy = jest.fn();
    setHeaderSpy = jest.fn();
    statusSpy = jest.fn().mockReturnThis();
    req = { params: { file: 'test.js' } };
    res = {
      send: sendSpy,
      setHeader: setHeaderSpy,
      status: statusSpy,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves the script if found', async () => {
    const scriptContent = 'console.log("hello");';
    const scriptPath = path.resolve(__dirname, '../../src/static/html/scripts/test.js');
    jest.spyOn(fs, 'existsSync').mockImplementation((p) => p === scriptPath);
    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (p === scriptPath) return scriptContent;
      throw new Error('not found');
    });

    await getScriptLocal(req as Request, res as Response);
    expect(setHeaderSpy).toHaveBeenCalledWith('Content-Type', 'application/javascript');
    expect(sendSpy).toHaveBeenCalledWith(scriptContent);
  });

  it('returns 404 if script not found', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    await getScriptLocal(req as Request, res as Response);
    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(sendSpy).toHaveBeenCalledWith('File not found');
  });

  it('returns 404 for path traversal filenames', async () => {
    req = { params: { file: '../../etc/passwd' } };
    const existsSpy = jest.spyOn(fs, 'existsSync');

    await getScriptLocal(req as Request, res as Response);

    expect(existsSpy).not.toHaveBeenCalled();
    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(sendSpy).toHaveBeenCalledWith('File not found');
  });
});
