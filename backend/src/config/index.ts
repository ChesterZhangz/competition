import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables in production
function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    console.warn(`Warning: Using default value for ${key}. Set this in production!`);
    return defaultValue;
  }
  return value;
}

// Generate a random secret for development (NOT for production)
function generateDevSecret(name: string): string {
  const crypto = require('crypto');
  const secret = crypto.randomBytes(32).toString('hex');
  console.warn(`Warning: Generated temporary ${name}. Set JWT secrets in .env for production!`);
  return secret;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  mongodb: {
    uri: getRequiredEnv('MONGODB_URI', 'mongodb://localhost:27017/math-competition'),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('JWT_ACCESS_SECRET is required in production'); })()
        : generateDevSecret('JWT_ACCESS_SECRET')),
    refreshSecret: process.env.JWT_REFRESH_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('JWT_REFRESH_SECRET is required in production'); })()
        : generateDevSecret('JWT_REFRESH_SECRET')),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },

  ai: {
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    deepseekBaseUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
};
