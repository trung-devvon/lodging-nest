import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'meta' in data) {
          const { meta, ...rest } = data as Record<string, unknown>;
          if ('data' in rest && Object.keys(rest).length === 1) {
            return {
              success: true,
              data: rest.data as T,
              meta: meta as SuccessResponse<T>['meta'],
            };
          }

          return {
            success: true,
            data: rest as T,
            meta: meta as SuccessResponse<T>['meta'],
          };
        }
        return { success: true, data } as SuccessResponse<T>;
      }),
    );
  }
}
