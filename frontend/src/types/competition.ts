/**
 * Competition Display Settings Types
 * 竞赛显示设置类型定义
 */

// 布局类型
export type LayoutType = 'single' | 'grid' | 'list';

// 比赛模式
export type CompetitionMode = 'onsite' | 'online';

// 预设主题
export type ThemePreset = 'default' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'custom';

// 显示模式（明暗）
export type DisplayMode = 'light' | 'dark';

// 自定义颜色配置
export interface CustomThemeColors {
  primary: string;      // 主色调
  secondary: string;    // 次要色
  background: string;   // 背景色
  text: string;         // 文字色
  accent: string;       // 强调色
}

// 双模式颜色配置（同时包含亮色和暗色）
export interface DualModeThemeColors {
  light: CustomThemeColors;
  dark: CustomThemeColors;
}

// 主题配置
export interface ThemeConfig {
  preset: ThemePreset;
  displayMode: DisplayMode;  // 当前显示模式
  custom?: DualModeThemeColors;  // 自定义颜色（包含亮暗两套）
}

// 竞赛显示设置
export interface CompetitionDisplaySettings {
  // 比赛模式
  mode: CompetitionMode;

  // 布局设置
  layout: LayoutType;
  questionsPerPage: number;  // 每页显示题目数 (1-10)

  // 颜色主题
  theme: ThemeConfig;

  // 显示选项
  showTimer: boolean;
  showProgress: boolean;
  showQuestionNumber: boolean;
}

// 题目显示状态
export interface QuestionDisplayState {
  questionId: string;
  visible: boolean;
  order: number;
}

// 预设主题颜色定义 - 亮色版本
export const THEME_PRESETS_LIGHT: Record<Exclude<ThemePreset, 'custom'>, CustomThemeColors> = {
  default: {
    primary: '#4f46e5',
    secondary: '#e0e7ff',
    background: '#ffffff',
    text: '#1e293b',
    accent: '#2cb1bc',
  },
  dark: {
    primary: '#6366f1',
    secondary: '#312e81',
    background: '#ffffff',
    text: '#1e293b',
    accent: '#22d3ee',
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#e0f2fe',
    background: '#f0f9ff',
    text: '#0c4a6e',
    accent: '#06b6d4',
  },
  forest: {
    primary: '#22c55e',
    secondary: '#dcfce7',
    background: '#f0fdf4',
    text: '#14532d',
    accent: '#10b981',
  },
  sunset: {
    primary: '#f97316',
    secondary: '#ffedd5',
    background: '#fff7ed',
    text: '#7c2d12',
    accent: '#f59e0b',
  },
};

// 预设主题颜色定义 - 暗色版本
export const THEME_PRESETS_DARK: Record<Exclude<ThemePreset, 'custom'>, CustomThemeColors> = {
  default: {
    primary: '#818cf8',
    secondary: '#312e81',
    background: '#0f172a',
    text: '#f1f5f9',
    accent: '#22d3ee',
  },
  dark: {
    primary: '#a5b4fc',
    secondary: '#1e1b4b',
    background: '#000000',
    text: '#f8fafc',
    accent: '#67e8f9',
  },
  ocean: {
    primary: '#38bdf8',
    secondary: '#0c4a6e',
    background: '#0c1929',
    text: '#e0f2fe',
    accent: '#22d3ee',
  },
  forest: {
    primary: '#4ade80',
    secondary: '#14532d',
    background: '#052e16',
    text: '#dcfce7',
    accent: '#34d399',
  },
  sunset: {
    primary: '#fb923c',
    secondary: '#7c2d12',
    background: '#1c0a00',
    text: '#ffedd5',
    accent: '#fbbf24',
  },
};

// 旧版兼容 - 合并版预设（用于向后兼容）
export const THEME_PRESETS: Record<Exclude<ThemePreset, 'custom'>, CustomThemeColors> = THEME_PRESETS_LIGHT;

// 默认显示设置 - 现场模式
export const DEFAULT_ONSITE_SETTINGS: CompetitionDisplaySettings = {
  mode: 'onsite',
  layout: 'single',
  questionsPerPage: 1,
  theme: {
    preset: 'dark',
    displayMode: 'dark',
  },
  showTimer: true,
  showProgress: true,
  showQuestionNumber: true,
};

// 默认显示设置 - 线上模式
export const DEFAULT_ONLINE_SETTINGS: CompetitionDisplaySettings = {
  mode: 'online',
  layout: 'grid',
  questionsPerPage: 4,
  theme: {
    preset: 'default',
    displayMode: 'light',
  },
  showTimer: true,
  showProgress: true,
  showQuestionNumber: true,
};

// 向后兼容的默认设置
export const DEFAULT_DISPLAY_SETTINGS: CompetitionDisplaySettings = DEFAULT_ONSITE_SETTINGS;

// 获取当前主题颜色
export function getThemeColors(theme: ThemeConfig): CustomThemeColors {
  const isDark = theme.displayMode === 'dark';

  if (theme.preset === 'custom' && theme.custom) {
    return isDark ? theme.custom.dark : theme.custom.light;
  }

  const presets = isDark ? THEME_PRESETS_DARK : THEME_PRESETS_LIGHT;
  return presets[theme.preset as Exclude<ThemePreset, 'custom'>] || THEME_PRESETS_LIGHT.default;
}

// 根据主色自动生成完整配色方案
export function generateThemeFromPrimary(primaryColor: string): DualModeThemeColors {
  const hsl = hexToHSL(primaryColor);

  // 生成亮色模式
  const light: CustomThemeColors = {
    primary: primaryColor,
    secondary: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 30, 20), l: 90 }),
    background: '#ffffff',
    text: hslToHex({ h: hsl.h, s: Math.min(hsl.s, 30), l: 15 }),
    accent: hslToHex({ h: (hsl.h + 180) % 360, s: hsl.s, l: 45 }),
  };

  // 生成暗色模式
  const dark: CustomThemeColors = {
    primary: hslToHex({ h: hsl.h, s: hsl.s, l: Math.min(hsl.l + 15, 70) }),
    secondary: hslToHex({ h: hsl.h, s: Math.min(hsl.s, 40), l: 20 }),
    background: hslToHex({ h: hsl.h, s: Math.min(hsl.s, 20), l: 8 }),
    text: hslToHex({ h: hsl.h, s: Math.max(hsl.s - 40, 10), l: 95 }),
    accent: hslToHex({ h: (hsl.h + 180) % 360, s: Math.min(hsl.s + 10, 90), l: 60 }),
  };

  return { light, dark };
}

// 颜色转换工具函数
interface HSL {
  h: number;
  s: number;
  l: number;
}

function hexToHSL(hex: string): HSL {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex({ h, s, l }: HSL): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 判断颜色是否为浅色
export function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// 布局配置信息
export interface LayoutConfig {
  id: LayoutType;
  nameKey: string;
  descKey: string;
  icon: string;
}

export const LAYOUT_CONFIGS: LayoutConfig[] = [
  {
    id: 'single',
    nameKey: 'competition.display.layoutSingle',
    descKey: 'competition.display.layoutSingleDesc',
    icon: 'single',
  },
  {
    id: 'grid',
    nameKey: 'competition.display.layoutGrid',
    descKey: 'competition.display.layoutGridDesc',
    icon: 'grid',
  },
  {
    id: 'list',
    nameKey: 'competition.display.layoutList',
    descKey: 'competition.display.layoutListDesc',
    icon: 'list',
  },
];

// ============================================
// Team & Participant Types (团队和参与者类型)
// ============================================

// 比赛参与模式
export type ParticipantMode = 'individual' | 'team';

// 参与者状态
export type ParticipantStatus = 'waiting' | 'ready' | 'playing' | 'finished';

// 单个参与者
export interface Participant {
  id: string;
  nickname: string;
  avatar?: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  rank?: number;
  status: ParticipantStatus;
  teamId?: string;
  isOnline: boolean;
  lastAnswerCorrect?: boolean;
  currentStreak?: number;
}

// 团队
export interface Team {
  id: string;
  name: string;
  color: string;          // 团队颜色标识
  captainId: string;      // 队长ID
  members: Participant[];
  totalScore: number;
  averageScore: number;
  correctCount: number;
  wrongCount: number;
  rank?: number;
}

// 积分榜条目 - 个人模式
export interface LeaderboardEntry {
  rank: number;
  participant: Participant;
  change?: 'up' | 'down' | 'same' | 'new';
  previousRank?: number;
}

// 积分榜条目 - 团队模式
export interface TeamLeaderboardEntry {
  rank: number;
  team: Team;
  change?: 'up' | 'down' | 'same' | 'new';
  previousRank?: number;
}

// ============================================
// Referee Types (裁判类型)
// ============================================

// 裁判权限
export interface RefereePermissions {
  canAdjustScore: boolean;      // 可以调整分数
  canOverrideAnswer: boolean;   // 可以覆盖答案判定
  canPauseGame: boolean;        // 可以暂停比赛
  canDisqualify: boolean;       // 可以取消参赛资格
}

// 裁判
export interface Referee {
  id: string;
  userId: string;
  nickname: string;
  permissions: RefereePermissions;
  isOnline: boolean;
}

// 分数调整记录
export interface ScoreAdjustment {
  id: string;
  refereeId: string;
  refereeName: string;
  targetType: 'participant' | 'team';
  targetId: string;
  targetName: string;
  previousScore: number;
  adjustment: number;        // 正数加分，负数减分
  newScore: number;
  reason: string;
  timestamp: Date;
}

// ============================================
// Competition Simulation Types (比赛模拟类型)
// ============================================

// 比赛阶段
export type CompetitionPhase =
  | 'setup'           // 设置阶段
  | 'team-formation'  // 组队阶段
  | 'waiting'         // 等待开始
  | 'countdown'       // 倒计时
  | 'question'        // 答题中
  | 'revealing'       // 揭晓答案
  | 'leaderboard'     // 展示排行榜
  | 'finished';       // 比赛结束

// 模拟比赛状态
export interface SimulationState {
  phase: CompetitionPhase;
  participantMode: ParticipantMode;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  participants: Participant[];
  teams: Team[];
  referees: Referee[];
  scoreAdjustments: ScoreAdjustment[];
  isRunning: boolean;
}

// 比赛设置（扩展）
export interface CompetitionSettings extends CompetitionDisplaySettings {
  participantMode: ParticipantMode;
  teamSize?: number;           // 每队人数限制
  minTeamSize?: number;        // 最少队员数
  allowReferee: boolean;       // 是否允许裁判
  refereeCount?: number;       // 裁判数量
  questionTimeLimit: number;   // 每题时间限制（秒）
  basePoints: number;          // 基础分数
  timeBonusEnabled: boolean;   // 是否启用时间奖励
  penaltyEnabled: boolean;     // 是否启用答错扣分
  penaltyPoints?: number;      // 答错扣分
}

// 默认比赛设置
export const DEFAULT_COMPETITION_SETTINGS: CompetitionSettings = {
  ...DEFAULT_ONSITE_SETTINGS,
  participantMode: 'individual',
  teamSize: 4,
  minTeamSize: 2,
  allowReferee: true,
  refereeCount: 1,
  questionTimeLimit: 60,
  basePoints: 100,
  timeBonusEnabled: true,
  penaltyEnabled: false,
  penaltyPoints: 0,
};

// 团队颜色预设
export const TEAM_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

// 模拟用的默认昵称
export const MOCK_NICKNAMES = [
  '小明', '小红', '小华', '小李', '小王', '小张', '小刘', '小陈',
  'Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
  '数学达人', '积分高手', '微积分王', '函数大师', '方程专家', '几何天才',
];

// 模拟用的团队名称
export const MOCK_TEAM_NAMES = [
  '微积分战队', '数学精英', '函数天团', '方程特战队',
  'Math Stars', 'Integral Heroes', 'Calculus Champions', 'Formula Masters',
  '梦之队', '王者之师', '极限突破', '无限可能',
];
