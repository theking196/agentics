import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuthService } from './services/oauth';
import { GitHubPlatform } from './platforms/github';
import { db } from './db';
import { userRepository, platformConnectionRepository, apiKeyRepository } from './db';

dotenv.config();

const app = express();
const oauthService = new OAuthService();

oauthService.registerPlatform('github', new GitHubPlatform());

app.use(cors());
app.use(express.json());

function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  
  if (!apiKey) {
    res.status(401).json({ error: 'Missing X-API-Key header' });
    return;
  }
  
  const keyRecord = apiKeyRepository.findByKey(apiKey);
  if (!keyRecord) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  
  req.headers['x-user-id'] = keyRecord.user_id;
  next();
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/auth/:platform/authorize', async (req: Request, res: Response) => {
  const { platform } = req.params;
  try {
    const authUrl = oauthService.getAuthorizationUrl(platform);
    res.json({ authUrl });
  } catch (error) {
    res.status(400).json({ error: `Platform '${platform}' not supported` });
  }
});

app.get('/auth/:platform/callback', async (req: Request, res: Response) => {
  const { platform } = req.params;
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  try {
    const result = await oauthService.handleCallback(platform, code as string, state as string | undefined);
    res.json({ success: true, user: result.user, platform: result.platform });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});

app.get('/platforms', (_req: Request, res: Response) => {
  const platforms = oauthService.getAvailablePlatforms();
  res.json({ platforms });
});

app.get('/api/platforms', apiKeyAuth, (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const connections = platformConnectionRepository.findByUser(userId);
  const platforms = connections.map(c => ({
    platform: c.platform,
    connected: true,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));
  res.json({ platforms });
});

app.get('/api/platforms/:platform/user', apiKeyAuth, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { platform } = req.params;
  
  const connection = platformConnectionRepository.findByUserAndPlatform(userId, platform);
  if (!connection) {
    res.status(404).json({ error: `Platform '${platform}' not connected` });
    return;
  }
  
  const user = userRepository.findById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  res.json({
    platform,
    user: {
      id: user.id,
      email: user.email,
    },
    connected_at: connection.created_at,
  });
});

app.get('/api/platforms/github/repos', apiKeyAuth, async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  const connection = platformConnectionRepository.findByUserAndPlatform(userId, 'github');
  if (!connection) {
    res.status(404).json({ error: 'GitHub not connected' });
    return;
  }
  
  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    
    const repos = await response.json() as Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      updated_at: string;
    }>;
    
    res.json({
      repos: repos.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        url: r.html_url,
        updated_at: r.updated_at,
      })),
    });
  } catch (error) {
    console.error('GitHub repos error:', error);
    res.status(500).json({ error: 'Failed to fetch GitHub repositories' });
  }
});

app.post('/api/keys', apiKeyAuth, (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  const newKey = apiKeyRepository.create(userId);
  res.status(201).json({
    id: newKey.id,
    key: newKey.key,
    created_at: newKey.created_at,
  });
});

app.get('/api/keys', apiKeyAuth, (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  const keys = apiKeyRepository.findByUser(userId);
  res.json({
    keys: keys.map(k => ({
      id: k.id,
      key: k.key.substring(0, 12) + '...',
      created_at: k.created_at,
    })),
  });
});

app.delete('/api/keys/:id', apiKeyAuth, (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { id } = req.params;
  
  const keys = apiKeyRepository.findByUser(userId);
  const key = keys.find(k => k.id === id);
  
  if (!key) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }
  
  apiKeyRepository.delete(id);
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, oauthService };