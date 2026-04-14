import { PlatformProvider, OAuthConfig, Platform, TokenResponse, UserInfo } from './types';

export class GenericOAuth2 implements PlatformProvider {
  private config: OAuthConfig;
  private platform: Platform;

  constructor(platform: Platform, config: OAuthConfig) {
    this.platform = platform;
    this.config = {
      ...config,
      scopes: config.scopes.length > 0 ? config.scopes : platform.scopes,
    };
  }

  getPlatform(): Platform {
    return this.platform;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });
    return `${this.platform.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<TokenResponse> {
    const response = await fetch(this.platform.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(this.platform.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json() as {
      id?: string;
      sub?: string;
      user_id?: string;
      email?: string;
      name?: string;
      picture?: string;
      avatar?: string;
    };
    return {
      id: data.id || data.sub || data.user_id || '',
      email: data.email,
      name: data.name,
      picture: data.picture || data.avatar,
    };
  }
}