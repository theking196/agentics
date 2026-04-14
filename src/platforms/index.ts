import { Platform, PlatformProvider, OAuthConfig } from './types';
import { GoogleOAuth } from './google';
import { GenericOAuth2 } from './generic';

export { Platform, PlatformProvider, OAuthConfig, TokenResponse, UserInfo } from './types';
export { GoogleOAuth } from './google';
export { GenericOAuth2 } from './generic';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

const baseConfig: OAuthConfig = {
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  scopes: [],
};

export const platforms: Record<string, PlatformProvider> = {};

if (googleClientId && googleClientSecret) {
  platforms['google'] = new GoogleOAuth({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri,
    scopes: ['openid', 'email', 'profile'],
  });
}

export function registerPlatform(id: string, provider: PlatformProvider): void {
  platforms[id] = provider;
}

export function getPlatformList(): Platform[] {
  return Object.values(platforms).map(p => p.getPlatform());
}

export function getPlatform(id: string): PlatformProvider | undefined {
  return platforms[id];
}