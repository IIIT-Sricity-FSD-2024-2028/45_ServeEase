import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  data: T;
}

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function successResponseSchema(model: Function, isArray = false) {
  return {
    properties: {
      success: { type: 'boolean', example: true },
      data: isArray
        ? { type: 'array', items: { $ref: getSchemaPath(model) } }
        : { $ref: getSchemaPath(model) },
    },
  };
}
