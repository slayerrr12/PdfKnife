export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MissingBinaryError extends Error {
  constructor(binaryName: string, hint?: string) {
    super(hint ? `${binaryName} is unavailable. ${hint}` : `${binaryName} is unavailable.`);
    this.name = 'MissingBinaryError';
  }
}
