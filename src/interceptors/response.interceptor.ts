import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const skip = this.reflector.get<boolean>(
      'skipInterceptor',
      context.getHandler(),
    );

    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (response.headersSent) {
          return data;
        }
        return {
          message: data.message || 'Request successful',
          data: data.data || data,
          success: data.success ?? true,
        };
      }),
    );
  }
}
