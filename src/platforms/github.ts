import { OAuthPlatform, PlatformConfig, PlatformTokens, PlatformUser } from '../types/oauth';

interface GitHubTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export class GitHubPlatform implements OAuthPlatform {
  readonly name = 'github';
  private readonly authUrl = 'https://github.com/login/oauth/authorize';
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  private readonly userApiUrl = 'https://api.github.com/user';

  getAuthUrl(config: PlatformConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: config.scopes.join(' '),
      ...(state && { state }),
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(config: PlatformConfig, code: string): Promise<PlatformTokens> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }

    const data = await response.json() as GitHubTokenResponse;
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async getUserInfo(_config: PlatformConfig, tokens: PlatformTokens): Promise<PlatformUser> {
    const response = await fetch(this.userApiUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const data = await response.json() as GitHubUserResponse;
    
    return {
      id: String(data.id),
      email: data.email || `${data.login}@users.noreply.github.com`,
      name: data.name || data.login,
      avatar: data.avatar_url,
    };
  }
}