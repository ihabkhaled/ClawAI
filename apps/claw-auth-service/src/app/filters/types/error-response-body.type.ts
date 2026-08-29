export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  code?: string;
  errorCode?: string;
  errors?: unknown[];
  // PAYG refusals put the two numbers a user needs to act on the wire beside
  // the code. Declared explicitly rather than as an open bag: an error body is
  // readable by the customer, so every field that reaches it is reviewed once,
  // here, instead of wherever the exception happened to be constructed.
  availableMicroUsd?: number;
  requiredMicroUsd?: number | null;
  timestamp: string;
}
