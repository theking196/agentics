export interface OAuthPlatform {
  name: string;
  getAuthUrl(config: PlatformConfig, state?: string): string;
  exchangeCode(config: PlatformConfig, code: string): Promise<PlatformTokens>;
  getUserInfo(config: PlatformConfig, tokens: PlatformTokens): Promise<PlatformUser>;
}

export interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
}

export interface PlatformTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PlatformUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}