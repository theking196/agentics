import { PlatformProvider, OAuthConfig, Platform, TokenResponse, UserInfo } from './types';

export class GoogleOAuth implements PlatformProvider {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = {
      ...config,
      scopes: config.scopes.length > 0 ? config.scopes : ['openid', 'email', 'profile'],
    };
  }

  getPlatform(): Platform {
    return {
      id: 'google',
      name: 'Google',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: this.config.scopes,
    };
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${this.getPlatform().authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<TokenResponse> {
    const response = await fetch(this.getPlatform().tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      tokenType: data.token_type,
    };
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${this.getPlatform().userInfoUrl}?access_token=${accessToken}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json() as { sub: string; email?: string; name?: string; picture?: string };
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }
}