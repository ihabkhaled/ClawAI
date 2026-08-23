import type { TokenPair } from './token-session.types';

export interface VscodeAuthorizationRequestRecord {
  callbackUri: string;
  clientName: string;
  codeChallenge: string;
  state: string;
}

export interface VscodeAuthorizationCodeRecord {
  clientName: string;
  codeChallenge: string;
  userId: string;
}

export interface VscodeAuthorizationInitResult {
  authorizationPath: string;
  expiresIn: number;
  requestId: string;
}

export interface VscodeAuthorizationDetails {
  clientName: string;
  expiresIn: number;
}

export interface VscodeAuthorizationApproval {
  redirectUri: string;
}

export interface VscodeAuthorizationExchangeResult {
  tokens: TokenPair;
  /**
   * Which account these tokens belong to.
   *
   * The extension stores one session per backend origin and shares it across
   * windows. Without an account identity it cannot tell "the same user
   * re-authorized in another window", which it should adopt silently, from "a
   * different account now owns this slot", which it must refuse. It assumed the
   * second, so opening a second window logged the first one out.
   */
  accountId: string;
}
