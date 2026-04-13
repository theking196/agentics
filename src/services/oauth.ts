import { OAuthPlatform, PlatformConfig, PlatformTokens, PlatformUser } from '../types/oauth';
import { userRepository, platformConnectionRepository } from '../db';

const platformConfigs: Record<string, PlatformConfig> = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || '',
    scopes: ['user:email', 'read:user'],
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
    scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
  },
};

export interface CallbackResult {
  user: {
    id: string;
    email: string;
  };
  platform: string;
}

export class OAuthService {
  private platforms: Map<string, OAuthPlatform> = new Map();

  registerPlatform(name: string, platform: OAuthPlatform): void {
    this.platforms.set(name, platform);
  }

  getAvailablePlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  getAuthorizationUrl(platformName: string, state?: string): string {
    const platform = this.platforms.get(platformName);
    if (!platform) {
      throw new Error(`Platform '${platformName}' not supported`);
    }

    const config = platformConfigs[platformName];
    if (!config || !config.clientId || !config.callbackUrl) {
      throw new Error(`Platform '${platformName}' not configured`);
    }

    return platform.getAuthUrl(config, state);
  }

  async handleCallback(platformName: string, code: string, _state?: string): Promise<CallbackResult> {
    const platform = this.platforms.get(platformName);
    if (!platform) {
      throw new Error(`Platform '${platformName}' not supported`);
    }

    const config = platformConfigs[platformName];
    if (!config || !config.clientId || !config.clientSecret) {
      throw new Error(`Platform '${platformName}' not configured`);
    }

    const tokens = await platform.exchangeCode(config, code);
    const userInfo = await platform.getUserInfo(config, tokens);

    let user = userRepository.findByEmail(userInfo.email);
    if (!user) {
      user = userRepository.create(userInfo.email);
    }

    const existingConnection = platformConnectionRepository.findByUserAndPlatform(user.id, platformName);
    if (existingConnection) {
      platformConnectionRepository.update(existingConnection.id, {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || null,
        expires_at: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
      });
    } else {
      platformConnectionRepository.create({
        user_id: user.id,
        platform: platformName,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || null,
        expires_at: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      platform: platformName,
    };
  }
}