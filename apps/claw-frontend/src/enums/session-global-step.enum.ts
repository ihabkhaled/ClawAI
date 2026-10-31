/** Where the two-step dialog is: nothing open, asking for the password, or asking to type the phrase. */
export enum SessionGlobalStep {
  CLOSED = 'CLOSED',
  PASSWORD = 'PASSWORD',
  CONFIRM = 'CONFIRM',
}
