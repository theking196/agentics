export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface Platform {
  id: string;
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

export interface PlatformProvider {
  getPlatform(): Platform;
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<TokenResponse>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}