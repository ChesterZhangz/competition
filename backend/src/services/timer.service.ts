import { redis } from '../config/redis';
import { Competition } from '../models';
import { Server as SocketServer, Namespace } from 'socket.io';

export interface TimerState {
  competitionId: string;
  questionIndex: number;
  totalDuration: number;      // 总时间（毫秒）
  remainingTime: number;      // 剩余时间（毫秒）
  isRunning: boolean;
  startedAt?: number;         // 开始时间戳
  pausedAt?: number;          // 暂停时间戳
}

export class TimerService {
  private io: SocketServer | null = null;
  private competitionNamespace: Namespace | null = null;
  private tickIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Set Socket.IO server instance
  setSocketServer(io: SocketServer): void {
    this.io = io;
    // Get the competition namespace for broadcasting timer events
    this.competitionNamespace = io.of('/competition');
  }

  // Get Redis key for timer state
  private getTimerKey(competitionId: string): string {
    return `competition:${competitionId}:timer`;
  }

  // Get timer state from Redis
  async getTimerState(competitionId: string): Promise<TimerState | null> {
    const data = await redis.get(this.getTimerKey(competitionId));
    if (!data) return null;
    return JSON.parse(data);
  }

  // Save timer state to Redis
  private async saveTimerState(state: TimerState): Promise<void> {
    await redis.set(
      this.getTimerKey(state.competitionId),
      JSON.stringify(state),
      'EX',
      86400 // 24 hours expiry
    );
  }

  // Start timer for a question
  async startTimer(
    competitionId: string,
    questionIndex: number,
    durationSeconds: number
  ): Promise<TimerState> {
    const durationMs = durationSeconds * 1000;
    const now = Date.now();

    const state: TimerState = {
      competitionId,
      questionIndex,
      totalDuration: durationMs,
      remainingTime: durationMs,
      isRunning: true,
      startedAt: now,
    };

    await this.saveTimerState(state);

    // Update competition timer state in MongoDB
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'timerState.questionStartTime': new Date(now),
          'timerState.remainingTime': durationMs,
          'timerState.isRunning': true,
          'timerState.pausedAt': null,
        },
      }
    );

    // Start tick interval
    this.startTickInterval(competitionId);

    // Broadcast timer started
    this.broadcastTimerEvent(competitionId, 'timer:started', {
      questionIndex,
      totalDuration: durationMs,
      remainingTime: durationMs,
    });

    return state;
  }

  // Pause timer
  async pauseTimer(competitionId: string): Promise<TimerState | null> {
    const state = await this.getTimerState(competitionId);
    if (!state || !state.isRunning) return state;

    const now = Date.now();
    const elapsed = now - (state.startedAt || now);
    const newRemaining = Math.max(0, state.remainingTime - elapsed);

    state.remainingTime = newRemaining;
    state.isRunning = false;
    state.pausedAt = now;
    state.startedAt = undefined;

    await this.saveTimerState(state);

    // Update MongoDB
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'timerState.remainingTime': newRemaining,
          'timerState.isRunning': false,
          'timerState.pausedAt': new Date(now),
        },
      }
    );

    // Stop tick interval
    this.stopTickInterval(competitionId);

    // Broadcast timer paused
    this.broadcastTimerEvent(competitionId, 'timer:paused', {
      remainingTime: newRemaining,
    });

    return state;
  }

  // Resume timer
  async resumeTimer(competitionId: string): Promise<TimerState | null> {
    const state = await this.getTimerState(competitionId);
    if (!state || state.isRunning) return state;

    const now = Date.now();
    state.isRunning = true;
    state.startedAt = now;
    state.pausedAt = undefined;

    await this.saveTimerState(state);

    // Update MongoDB
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'timerState.questionStartTime': new Date(now),
          'timerState.isRunning': true,
          'timerState.pausedAt': null,
        },
      }
    );

    // Start tick interval
    this.startTickInterval(competitionId);

    // Broadcast timer resumed
    this.broadcastTimerEvent(competitionId, 'timer:resumed', {
      remainingTime: state.remainingTime,
    });

    return state;
  }

  // Reset timer
  async resetTimer(
    competitionId: string,
    newDurationSeconds?: number
  ): Promise<TimerState | null> {
    const state = await this.getTimerState(competitionId);
    if (!state) return null;

    const durationMs = newDurationSeconds
      ? newDurationSeconds * 1000
      : state.totalDuration;

    state.totalDuration = durationMs;
    state.remainingTime = durationMs;
    state.isRunning = false;
    state.startedAt = undefined;
    state.pausedAt = undefined;

    await this.saveTimerState(state);

    // Update MongoDB
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'timerState.remainingTime': durationMs,
          'timerState.isRunning': false,
          'timerState.questionStartTime': null,
          'timerState.pausedAt': null,
        },
      }
    );

    // Stop tick interval
    this.stopTickInterval(competitionId);

    // Broadcast timer reset
    this.broadcastTimerEvent(competitionId, 'timer:reset', {
      totalDuration: durationMs,
      remainingTime: durationMs,
    });

    return state;
  }

  // Adjust timer (add/subtract time)
  async adjustTimer(
    competitionId: string,
    adjustmentSeconds: number
  ): Promise<TimerState | null> {
    const state = await this.getTimerState(competitionId);
    if (!state) return null;

    const adjustmentMs = adjustmentSeconds * 1000;
    let newRemaining: number;

    if (state.isRunning && state.startedAt) {
      const now = Date.now();
      const elapsed = now - state.startedAt;
      newRemaining = Math.max(0, state.remainingTime - elapsed + adjustmentMs);
      state.startedAt = now; // Reset start time
    } else {
      newRemaining = Math.max(0, state.remainingTime + adjustmentMs);
    }

    state.remainingTime = newRemaining;
    await this.saveTimerState(state);

    // Update MongoDB
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'timerState.remainingTime': newRemaining,
        },
      }
    );

    // Broadcast timer adjusted
    this.broadcastTimerEvent(competitionId, 'timer:adjusted', {
      remainingTime: newRemaining,
      adjustment: adjustmentMs,
    });

    return state;
  }

  // Stop timer (end of question)
  async stopTimer(competitionId: string): Promise<void> {
    const state = await this.getTimerState(competitionId);
    if (state) {
      state.isRunning = false;
      state.remainingTime = 0;
      await this.saveTimerState(state);
    }

    // Update MongoDB
    await Competition.updateOne(
      { _id: competitionId },
      {
        $set: {
          'timerState.remainingTime': 0,
          'timerState.isRunning': false,
        },
      }
    );

    // Stop tick interval
    this.stopTickInterval(competitionId);

    // Broadcast timer ended
    this.broadcastTimerEvent(competitionId, 'timer:ended', {});
  }

  // Get current remaining time (accounting for elapsed time if running)
  async getRemainingTime(competitionId: string): Promise<number> {
    const state = await this.getTimerState(competitionId);
    if (!state) return 0;

    if (state.isRunning && state.startedAt) {
      const elapsed = Date.now() - state.startedAt;
      return Math.max(0, state.remainingTime - elapsed);
    }

    return state.remainingTime;
  }

  // Start tick interval (broadcasts every second)
  private startTickInterval(competitionId: string): void {
    // Clear existing interval if any
    this.stopTickInterval(competitionId);

    const interval = setInterval(async () => {
      const remaining = await this.getRemainingTime(competitionId);

      if (remaining <= 0) {
        await this.stopTimer(competitionId);
        return;
      }

      // Broadcast tick
      this.broadcastTimerEvent(competitionId, 'timer:tick', {
        remainingTime: remaining,
      });
    }, 1000);

    this.tickIntervals.set(competitionId, interval);
  }

  // Stop tick interval
  private stopTickInterval(competitionId: string): void {
    const interval = this.tickIntervals.get(competitionId);
    if (interval) {
      clearInterval(interval);
      this.tickIntervals.delete(competitionId);
    }
  }

  // Broadcast timer event via Socket.IO (to competition namespace)
  private broadcastTimerEvent(
    competitionId: string,
    event: string,
    data: Record<string, unknown>
  ): void {
    if (this.competitionNamespace) {
      this.competitionNamespace.to(`competition:${competitionId}`).emit(event, {
        competitionId,
        ...data,
        timestamp: Date.now(),
      });
    }
  }

  // Clean up all timers (for server shutdown)
  cleanup(): void {
    for (const [competitionId] of this.tickIntervals) {
      this.stopTickInterval(competitionId);
    }
  }
}

export const timerService = new TimerService();
