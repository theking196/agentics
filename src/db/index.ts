import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { User, PlatformConnection, ApiKey } from '../types';

interface Database {
  users: User[];
  platformConnections: PlatformConnection[];
  apiKeys: ApiKey[];
}

let database: Database | null = null;

function getDbPath(): string {
  return process.env.DB_PATH || path.join(__dirname, '../../data/agentics.json');
}

function loadDatabase(): Database {
  if (database) return database;
  
  const dbPath = getDbPath();
  
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      database = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  
  if (!database) {
    database = {
      users: [],
      platformConnections: [],
      apiKeys: [],
    };
  }
  
  return database;
}

function saveDatabase(): void {
  if (!database) return;
  
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
}

export const userRepository = {
  create(email: string): User {
    const db = loadDatabase();
    const user: User = {
      id: uuidv4(),
      email,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    saveDatabase();
    return user;
  },
  
  findByEmail(email: string): User | null {
    const db = loadDatabase();
    return db.users.find(u => u.email === email) || null;
  },
  
  findById(id: string): User | null {
    const db = loadDatabase();
    return db.users.find(u => u.id === id) || null;
  }
};

export const platformConnectionRepository = {
  create(connection: Omit<PlatformConnection, 'id' | 'created_at' | 'updated_at'>): PlatformConnection {
    const db = loadDatabase();
    const now = new Date().toISOString();
    const pc: PlatformConnection = {
      id: uuidv4(),
      ...connection,
      created_at: now,
      updated_at: now,
    };
    db.platformConnections.push(pc);
    saveDatabase();
    return pc;
  },
  
  findByUserAndPlatform(userId: string, platform: string): PlatformConnection | null {
    const db = loadDatabase();
    return db.platformConnections.find(c => c.user_id === userId && c.platform === platform) || null;
  },
  
  update(connectionId: string, updates: Partial<PlatformConnection>): void {
    const db = loadDatabase();
    const index = db.platformConnections.findIndex(c => c.id === connectionId);
    if (index !== -1) {
      db.platformConnections[index] = {
        ...db.platformConnections[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      saveDatabase();
    }
  },
  
  findByUser(userId: string): PlatformConnection[] {
    const db = loadDatabase();
    return db.platformConnections.filter(c => c.user_id === userId);
  }
};

export const apiKeyRepository = {
  create(userId: string): ApiKey {
    const db = loadDatabase();
    const apiKey: ApiKey = {
      id: uuidv4(),
      key: `ag_${uuidv4().replace(/-/g, '')}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    db.apiKeys.push(apiKey);
    saveDatabase();
    return apiKey;
  },
  
  findByKey(key: string): ApiKey | null {
    const db = loadDatabase();
    return db.apiKeys.find(k => k.key === key) || null;
  },
  
  findByUser(userId: string): ApiKey[] {
    const db = loadDatabase();
    return db.apiKeys.filter(k => k.user_id === userId);
  },
  
  delete(id: string): void {
    const db = loadDatabase();
    const index = db.apiKeys.findIndex(k => k.id === id);
    if (index !== -1) {
      db.apiKeys.splice(index, 1);
      saveDatabase();
    }
  }
};

export const db = {
  users: userRepository,
  platformConnections: platformConnectionRepository,
  apiKeys: apiKeyRepository,
};