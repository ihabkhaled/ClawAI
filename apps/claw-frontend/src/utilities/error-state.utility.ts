export function extractErrorMessage(error: unknown): string | undefined {
  if (error === undefined || error === null) {
    return undefined;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string') {
      return message;
    }
  }
  return undefined;
}
