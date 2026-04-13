export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  key: string;
  user_id: string;
  created_at: string;
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