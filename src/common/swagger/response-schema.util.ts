export function successResponseSchema<T>(
  data: T,
  meta?: Record<string, unknown>,
) {
  return {
    example: meta
      ? {
          success: true,
          data,
          meta,
        }
      : {
          success: true,
          data,
        },
  };
}

export function errorResponseSchema(
  statusCode: number,
  message: string,
  code = 'BAD_REQUEST',
) {
  return {
    example: {
      success: false,
      error: {
        code,
        message,
        statusCode,
      },
    },
  };
}
