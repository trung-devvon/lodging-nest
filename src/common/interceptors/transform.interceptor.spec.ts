import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  it('unwraps paginated payloads that already use { data, meta }', (done) => {
    const interceptor = new TransformInterceptor();
    const next: CallHandler = {
      handle: () =>
        of({
          data: [{ id: 'guest-1' }],
          meta: { total: 1, page: 1, limit: 20 },
        }),
    };

    interceptor
      .intercept({} as ExecutionContext, next)
      .subscribe((response) => {
        expect(response).toEqual({
          success: true,
          data: [{ id: 'guest-1' }],
          meta: { total: 1, page: 1, limit: 20 },
        });
        done();
      });
  });
});
