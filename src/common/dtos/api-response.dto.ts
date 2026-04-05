export class ApiResponseDto<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[] | object;
  timestamp: Date;

  constructor(
    success: boolean,
    message: string,
    data?: T,
    errors?: string[] | object,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
    this.timestamp = new Date();
  }
}

export class PaginationQueryDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class PaginationResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class SuccessResponseDto<T> {
  success: true;
  data: T;
  message: string;

  constructor(data: T, message: string = 'Operación exitosa') {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

export class ErrorResponseDto {
  success: false;
  message: string;
  errors?: string[] | object;
  timestamp: Date;

  constructor(message: string, errors?: string[] | object) {
    this.success = false;
    this.message = message;
    this.errors = errors;
    this.timestamp = new Date();
  }
}
