export class ThreadGenerationLeaseLostError extends Error {
  constructor() {
    super('Generation worker lease was lost');
    this.name = ThreadGenerationLeaseLostError.name;
  }
}
