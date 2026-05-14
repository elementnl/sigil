import type { ValidationError } from './types';

export class SigilError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SigilError';
  }
}

export class SigilParseError extends SigilError {
  public readonly line: number;

  constructor(line: number, message: string) {
    super(`Line ${line}: ${message}`);
    this.name = 'SigilParseError';
    this.line = line;
  }
}

export class SigilValidationError extends SigilError {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const summary = errors.map((e) => e.message).join('; ');
    super(`Validation failed: ${summary}`);
    this.name = 'SigilValidationError';
    this.errors = errors;
  }
}

export class SigilSerializationError extends SigilError {
  constructor(message: string) {
    super(message);
    this.name = 'SigilSerializationError';
  }
}
