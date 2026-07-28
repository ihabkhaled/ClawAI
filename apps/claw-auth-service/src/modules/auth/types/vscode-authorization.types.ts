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
}
