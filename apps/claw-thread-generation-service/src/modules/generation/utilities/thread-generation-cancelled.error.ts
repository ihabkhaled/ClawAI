export class ThreadGenerationCancelledError extends Error {
  constructor() {
    super('Thread generation was cancelled');
    this.name = 'ThreadGenerationCancelledError';
  }
}
