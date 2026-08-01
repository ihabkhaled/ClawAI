export interface VscodeAuthorizationDetails {
  clientName: string;
  expiresIn: number;
}

export interface VscodeAuthorizationApproval {
  redirectUri: string;
}
