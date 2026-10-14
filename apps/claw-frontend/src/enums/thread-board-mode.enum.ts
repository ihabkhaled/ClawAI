/**
 * Who is looking at a Board. `Member` is the signed-in portal Board (`/board`); `Guest` is the
 * public, read-only Board on the marketing site (`/threads/board`), which needs no account.
 */
export enum ThreadBoardMode {
  Member = 'member',
  Guest = 'guest',
}
