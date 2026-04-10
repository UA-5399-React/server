import { ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const makeHost = (response: Partial<Response>, request: Partial<Request>) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    }) as ArgumentsHost;

  it('should preserve custom error code from HttpException response body', () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status } as Partial<Response>;
    const request = { method: 'POST', url: '/auth/login' } as Partial<Request>;
    const exception = new UnauthorizedException({
      message: 'Please confirm your email first',
      code: 'EMAIL_NOT_CONFIRMED',
    });

    filter.catch(exception, makeHost(response, request));

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        error: 'UnauthorizedException',
        message: 'Please confirm your email first',
        code: 'EMAIL_NOT_CONFIRMED',
        path: '/auth/login',
      }),
    );
  });
});
