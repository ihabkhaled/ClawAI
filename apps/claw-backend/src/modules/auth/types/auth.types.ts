export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  tokens: TokenPair;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    mustChangePassword: boolean;
  };
}

export interface RefreshResult {
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: Date;
}
