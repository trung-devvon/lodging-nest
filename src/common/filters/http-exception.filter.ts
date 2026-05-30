import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object') {
        const obj = response as any;
        message = obj.message ?? obj.error ?? 'Error';
        code = obj.code ?? obj.error?.toUpperCase?.()?.replace(/ /g, '_') ?? 'ERROR';
      }
      if (Array.isArray(message)) message = message[0];
    }

    reply.status(status).send({
      success: false,
      error: { code, message, statusCode: status },
    });
  }
}
