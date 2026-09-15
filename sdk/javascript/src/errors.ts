export class StellarClassicPulseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarClassicPulseError";
  }
}

export class ApiError extends StellarClassicPulseError {
  statusCode: number;
  payload: unknown;

  constructor(statusCode: number, message: string, payload?: unknown) {
    super(`API error ${statusCode}: ${message}`);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export class AuthenticationError extends StellarClassicPulseError {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
