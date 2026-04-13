import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuthService } from './services/oauth';
import { GitHubPlatform } from './platforms/github';
import './db';

dotenv.config();

const app = express();
const oauthService = new OAuthService();

oauthService.registerPlatform('github', new GitHubPlatform());

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, oauthService };
