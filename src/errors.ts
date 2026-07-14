export class EndpointNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EndpointNotFoundError';
  }
}

export class HandlerExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandlerExecutionError';
  }
}
