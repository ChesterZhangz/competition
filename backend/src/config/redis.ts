import Redis from 'ioredis';
import { config } from './index';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

// Helper functions for common Redis operations
export const redisHelpers = {
  // Store session data
  async setSession(userId: string, sessionId: string, data: object, ttlSeconds: number): Promise<void> {
    const key = `session:${userId}:${sessionId}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  },

  // Get session data
  async getSession(userId: string, sessionId: string): Promise<object | null> {
    const key = `session:${userId}:${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Delete session
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const key = `session:${userId}:${sessionId}`;
    await redis.del(key);
  },

  // Store competition state
  async setCompetitionState(competitionId: string, state: object): Promise<void> {
    const key = `competition:${competitionId}:state`;
    await redis.set(key, JSON.stringify(state));
  },

  // Get competition state
  async getCompetitionState(competitionId: string): Promise<object | null> {
    const key = `competition:${competitionId}:state`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  // Store leaderboard
  async updateLeaderboard(competitionId: string, participantId: string, score: number): Promise<void> {
    const key = `competition:${competitionId}:leaderboard`;
    await redis.zadd(key, score, participantId);
  },

  // Get leaderboard (top N)
  async getLeaderboard(competitionId: string, limit = 10): Promise<Array<{ participantId: string; score: number }>> {
    const key = `competition:${competitionId}:leaderboard`;
    const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    const leaderboard: Array<{ participantId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        participantId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return leaderboard;
  },
};
