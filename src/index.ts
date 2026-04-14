import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPlatformList, getPlatform, GoogleOAuth, GenericOAuth2 } from './platforms';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/platforms', (req, res) => {
  const platformList = getPlatformList();
  res.json({
    platforms: platformList.map(p => ({
      id: p.id,
      name: p.name,
      scopes: p.scopes,
    })),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;