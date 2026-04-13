import { PlatformTokens, PlatformUser } from '../types';

export interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
}

export interface OAuthPlatform {
  name: string;
  getAuthUrl(config: PlatformConfig, state?: string): string;
  exchangeCode(config: PlatformConfig, code: string): Promise<PlatformTokens>;
  getUserInfo(config: PlatformConfig, tokens: PlatformTokens): Promise<PlatformUser>;
  refreshToken?(config: PlatformConfig, refreshToken: string): Promise<PlatformTokens>;
}
