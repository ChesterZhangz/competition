# 开发规范与设计系统

## 一、设计理念

### 1.1 核心设计原则

| 原则 | 描述 |
|------|------|
| **极简主义** | 纯黑/纯白背景，减少视觉噪音 |
| **水滴玻璃风** | Glassmorphism 风格，毛玻璃效果增加层次感 |
| **大圆角设计** | 柔和友好的视觉体验 |
| **层次分明** | 通过阴影、模糊、透明度区分层级 |
| **动画优雅** | 流畅自然的过渡动画 |
| **图标动态化** | 所有图标都具有微动画和交互反馈 |

### 1.2 设计关键词

```
Glassmorphism · Minimalism · Cyan Accent · Large Radius · Smooth Animation · Animated Icons
```

---

## 二、颜色系统

### 2.1 主题色板

```typescript
// colors.ts - 颜色定义

export const colors = {
  // 主题色 - 青色系
  primary: {
    50:  '#e0fcff',
    100: '#bef8fd',
    200: '#87eaf2',
    300: '#54d1db',
    400: '#38bec9',
    500: '#2cb1bc',  // 主色
    600: '#14919b',
    700: '#0e7c86',
    800: '#0a6c74',
    900: '#044e54',
  },

  // 暗色主题
  dark: {
    bg: {
      primary:   '#000000',    // 纯黑背景
      secondary: '#0a0a0a',    // 次级背景
      tertiary:  '#141414',    // 三级背景
      elevated:  '#1a1a1a',    // 抬升背景
    },
    surface: {
      default:   'rgba(255, 255, 255, 0.03)',  // 玻璃表面
      hover:     'rgba(255, 255, 255, 0.06)',
      active:    'rgba(255, 255, 255, 0.09)',
    },
    border: {
      subtle:    'rgba(255, 255, 255, 0.06)',
      default:   'rgba(255, 255, 255, 0.10)',
      strong:    'rgba(255, 255, 255, 0.15)',
    },
    text: {
      primary:   '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.70)',
      tertiary:  'rgba(255, 255, 255, 0.50)',
      disabled:  'rgba(255, 255, 255, 0.30)',
    },
  },

  // 亮色主题
  light: {
    bg: {
      primary:   '#ffffff',    // 纯白背景
      secondary: '#fafafa',
      tertiary:  '#f5f5f5',
      elevated:  '#ffffff',
    },
    surface: {
      default:   'rgba(0, 0, 0, 0.02)',
      hover:     'rgba(0, 0, 0, 0.04)',
      active:    'rgba(0, 0, 0, 0.06)',
    },
    border: {
      subtle:    'rgba(0, 0, 0, 0.04)',
      default:   'rgba(0, 0, 0, 0.08)',
      strong:    'rgba(0, 0, 0, 0.12)',
    },
    text: {
      primary:   '#000000',
      secondary: 'rgba(0, 0, 0, 0.70)',
      tertiary:  'rgba(0, 0, 0, 0.50)',
      disabled:  'rgba(0, 0, 0, 0.30)',
    },
  },

  // 语义色
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error:   '#ef4444',
    info:    '#2cb1bc',
  },
};
```

### 2.2 CSS 变量定义

```css
/* variables.css */

:root {
  /* 主题色 */
  --color-primary-50: #e0fcff;
  --color-primary-100: #bef8fd;
  --color-primary-200: #87eaf2;
  --color-primary-300: #54d1db;
  --color-primary-400: #38bec9;
  --color-primary-500: #2cb1bc;
  --color-primary-600: #14919b;
  --color-primary-700: #0e7c86;
  --color-primary-800: #0a6c74;
  --color-primary-900: #044e54;

  /* 圆角 */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-2xl: 40px;
  --radius-full: 9999px;

  /* 间距 */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;

  /* 动画 */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* 模糊 */
  --blur-sm: 8px;
  --blur-md: 16px;
  --blur-lg: 24px;
  --blur-xl: 40px;

  /* 阴影 */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);
}

/* 暗色主题 */
[data-theme="dark"] {
  --bg-primary: #000000;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #141414;
  --bg-elevated: #1a1a1a;

  --surface-default: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.06);
  --surface-active: rgba(255, 255, 255, 0.09);

  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-strong: rgba(255, 255, 255, 0.15);

  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.70);
  --text-tertiary: rgba(255, 255, 255, 0.50);
  --text-disabled: rgba(255, 255, 255, 0.30);

  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.10);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  --icon-primary: #ffffff;
  --icon-secondary: rgba(255, 255, 255, 0.60);
}

/* 亮色主题 */
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --bg-elevated: #ffffff;

  --surface-default: rgba(0, 0, 0, 0.02);
  --surface-hover: rgba(0, 0, 0, 0.04);
  --surface-active: rgba(0, 0, 0, 0.06);

  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-default: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.12);

  --text-primary: #000000;
  --text-secondary: rgba(0, 0, 0, 0.70);
  --text-tertiary: rgba(0, 0, 0, 0.50);
  --text-disabled: rgba(0, 0, 0, 0.30);

  --glass-bg: rgba(255, 255, 255, 0.70);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

  --icon-primary: #000000;
  --icon-secondary: rgba(0, 0, 0, 0.60);
}
```

---

## 三、动态 SVG 图标系统

### 3.1 图标设计原则

| 原则 | 说明 |
|------|------|
| **语义化命名** | 图标名称清晰描述其用途，如 `IconCompetition`、`IconProblemBank` |
| **统一尺寸** | 基于 24x24 网格设计，支持 16/20/24/32/40 等尺寸 |
| **线条风格** | 统一使用 2px 描边，圆角端点 |
| **动态交互** | 每个图标都有 idle、hover、active、loading 状态动画 |
| **主题适配** | 使用 `currentColor` 自动适配主题色 |

### 3.2 图标组件基础架构

```tsx
// components/icons/types.ts

export interface IconProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  animated?: boolean;          // 是否启用动画
  animationState?: 'idle' | 'hover' | 'active' | 'loading';
  strokeWidth?: number;
  title?: string;              // 无障碍标题
  description?: string;        // 无障碍描述
}

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};
```

```tsx
// components/icons/IconWrapper.tsx

import { motion, Variants, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from './types';
import { cn } from '@/utils';

interface IconWrapperProps extends IconProps {
  children: React.ReactNode;
  variants?: Variants;
}

export const IconWrapper = forwardRef<SVGSVGElement, IconWrapperProps>(
  (
    {
      children,
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title,
      description,
      variants,
      ...props
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const defaultVariants: Variants = {
      idle: { scale: 1, rotate: 0 },
      hover: { scale: 1.1 },
      active: { scale: 0.95 },
      loading: {
        rotate: 360,
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('transition-colors', className)}
        variants={animated ? (variants || defaultVariants) : undefined}
        animate={animated ? animationState : undefined}
        role="img"
        aria-label={title}
        aria-describedby={description ? 'icon-desc' : undefined}
        {...props}
      >
        {title && <title>{title}</title>}
        {description && <desc id="icon-desc">{description}</desc>}
        {children}
      </motion.svg>
    );
  }
);

IconWrapper.displayName = 'IconWrapper';
```

### 3.3 图标目录结构

```
frontend/src/components/icons/
├── index.ts                      # 统一导出
├── types.ts                      # 类型定义
├── IconWrapper.tsx               # 图标包装器
│
├── navigation/                   # 导航类图标
│   ├── IconHome.tsx              # 首页
│   ├── IconMenu.tsx              # 菜单
│   ├── IconBack.tsx              # 返回
│   ├── IconForward.tsx           # 前进
│   └── index.ts
│
├── competition/                  # 比赛类图标
│   ├── IconCompetition.tsx       # 比赛
│   ├── IconTrophy.tsx            # 奖杯
│   ├── IconTimer.tsx             # 计时器
│   ├── IconLeaderboard.tsx       # 排行榜
│   ├── IconStart.tsx             # 开始
│   ├── IconPause.tsx             # 暂停
│   ├── IconStop.tsx              # 停止
│   ├── IconQRCode.tsx            # 二维码
│   └── index.ts
│
├── problem/                      # 题库类图标
│   ├── IconProblemBank.tsx       # 题库
│   ├── IconProblem.tsx           # 题目
│   ├── IconIntegral.tsx          # 积分符号
│   ├── IconDifficulty.tsx        # 难度
│   ├── IconTag.tsx               # 标签
│   ├── IconSolution.tsx          # 解答
│   └── index.ts
│
├── auth/                         # 认证类图标
│   ├── IconUser.tsx              # 用户
│   ├── IconLogin.tsx             # 登录
│   ├── IconLogout.tsx            # 登出
│   ├── IconLock.tsx              # 锁定
│   ├── IconUnlock.tsx            # 解锁
│   ├── IconShield.tsx            # 安全盾
│   └── index.ts
│
├── action/                       # 操作类图标
│   ├── IconAdd.tsx               # 添加
│   ├── IconEdit.tsx              # 编辑
│   ├── IconDelete.tsx            # 删除
│   ├── IconSave.tsx              # 保存
│   ├── IconSearch.tsx            # 搜索
│   ├── IconFilter.tsx            # 筛选
│   ├── IconRefresh.tsx           # 刷新
│   ├── IconDownload.tsx          # 下载
│   ├── IconUpload.tsx            # 上传
│   └── index.ts
│
├── feedback/                     # 反馈类图标
│   ├── IconSuccess.tsx           # 成功
│   ├── IconError.tsx             # 错误
│   ├── IconWarning.tsx           # 警告
│   ├── IconInfo.tsx              # 信息
│   ├── IconLoading.tsx           # 加载
│   └── index.ts
│
├── theme/                        # 主题类图标
│   ├── IconSun.tsx               # 太阳（浅色）
│   ├── IconMoon.tsx              # 月亮（深色）
│   ├── IconGlobe.tsx             # 地球（语言）
│   └── index.ts
│
└── misc/                         # 其他图标
    ├── IconMath.tsx              # 数学符号
    ├── IconChart.tsx             # 图表
    ├── IconSettings.tsx          # 设置
    ├── IconHelp.tsx              # 帮助
    └── index.ts
```

### 3.4 图标组件示例

#### 3.4.1 首页图标 (IconHome)

```tsx
// components/icons/navigation/IconHome.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 首页图标
 * 语义：导航到首页/主页
 * 动画：房屋轻微上下浮动，烟囱冒烟效果
 */
export const IconHome = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '首页',
      description = '返回首页',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const houseVariants: Variants = {
      idle: { y: 0 },
      hover: {
        y: [-1, 1, -1],
        transition: {
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      active: { scale: 0.95 },
    };

    const smokeVariants: Variants = {
      idle: { opacity: 0, y: 0 },
      hover: {
        opacity: [0, 0.6, 0],
        y: [0, -4, -8],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          ease: 'easeOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        {/* 烟雾效果 */}
        {animated && (
          <motion.circle
            cx="17"
            cy="4"
            r="1.5"
            fill={color || 'currentColor'}
            opacity="0"
            variants={smokeVariants}
            animate={animationState}
          />
        )}

        {/* 房屋主体 */}
        <motion.g
          variants={animated ? houseVariants : undefined}
          animate={animated ? animationState : undefined}
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 屋顶 */}
          <path d="M3 12L12 3l9 9" />
          {/* 房屋 */}
          <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
          {/* 门 */}
          <path d="M9 21V14a1 1 0 011-1h4a1 1 0 011 1v7" />
          {/* 烟囱 */}
          <path d="M16 6V4a1 1 0 011-1h1a1 1 0 011 1v4" />
        </motion.g>
      </motion.svg>
    );
  }
);

IconHome.displayName = 'IconHome';
```

#### 3.4.2 比赛图标 (IconCompetition)

```tsx
// components/icons/competition/IconCompetition.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 比赛图标
 * 语义：表示比赛/比赛活动
 * 动画：旗帜飘动效果
 */
export const IconCompetition = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '比赛',
      description = '数学比赛',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const flagVariants: Variants = {
      idle: { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' },
      hover: {
        d: [
          'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
          'M4 15s1.5-1.5 4.5-0.5 4.5 2.5 7.5 2.5 3.5-1.5 3.5-1.5V3s-1 1.5-3.5 1.5-5-2.5-8.5-2-4.5 1-4.5 1z',
          'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
        ],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      active: { scale: 0.95 },
    };

    const poleVariants: Variants = {
      idle: { rotate: 0 },
      hover: {
        rotate: [-1, 1, -1],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        <motion.g
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 旗帜 */}
          <motion.path
            variants={animated ? flagVariants : undefined}
            animate={animated ? animationState : undefined}
            fill={animationState === 'hover' ? 'var(--color-primary-500)' : 'none'}
            fillOpacity={0.2}
          />

          {/* 旗杆 */}
          <motion.line
            x1="4"
            y1="22"
            x2="4"
            y2="3"
            variants={animated ? poleVariants : undefined}
            animate={animated ? animationState : undefined}
          />
        </motion.g>
      </motion.svg>
    );
  }
);

IconCompetition.displayName = 'IconCompetition';
```

#### 3.4.3 奖杯图标 (IconTrophy)

```tsx
// components/icons/competition/IconTrophy.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 奖杯图标
 * 语义：表示获胜/成就/排行榜第一
 * 动画：闪光效果 + 轻微摇晃
 */
export const IconTrophy = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '奖杯',
      description = '冠军奖杯',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const trophyVariants: Variants = {
      idle: { rotate: 0 },
      hover: {
        rotate: [-3, 3, -3],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      active: { scale: 0.95 },
    };

    const sparkleVariants: Variants = {
      idle: { opacity: 0, scale: 0 },
      hover: {
        opacity: [0, 1, 0],
        scale: [0.5, 1, 0.5],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        {/* 闪光效果 */}
        {animated && (
          <>
            <motion.circle
              cx="6"
              cy="4"
              r="1"
              fill="var(--color-primary-400)"
              variants={sparkleVariants}
              animate={animationState}
            />
            <motion.circle
              cx="18"
              cy="6"
              r="0.8"
              fill="var(--color-primary-400)"
              variants={sparkleVariants}
              animate={animationState}
              style={{ animationDelay: '0.3s' }}
            />
          </>
        )}

        <motion.g
          variants={animated ? trophyVariants : undefined}
          animate={animated ? animationState : undefined}
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transformOrigin: 'center bottom' }}
        >
          {/* 奖杯主体 */}
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 01-10 0V4z" />

          {/* 左手柄 */}
          <path d="M7 7H4a1 1 0 00-1 1v1a3 3 0 003 3" />

          {/* 右手柄 */}
          <path d="M17 7h3a1 1 0 011 1v1a3 3 0 01-3 3" />

          {/* 星星装饰 */}
          <path d="M12 8l.5 1 1 .1-.8.7.2 1-.9-.5-.9.5.2-1-.8-.7 1-.1z" fill={color || 'currentColor'} />
        </motion.g>
      </motion.svg>
    );
  }
);

IconTrophy.displayName = 'IconTrophy';
```

#### 3.4.4 计时器图标 (IconTimer)

```tsx
// components/icons/competition/IconTimer.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 计时器图标
 * 语义：表示倒计时/时间限制
 * 动画：指针转动 + 紧急时闪烁
 */
export const IconTimer = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '计时器',
      description = '倒计时计时器',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const handVariants: Variants = {
      idle: { rotate: 0 },
      hover: {
        rotate: 360,
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        },
      },
      loading: {
        rotate: 360,
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        },
      },
    };

    const pulseVariants: Variants = {
      idle: { scale: 1, opacity: 1 },
      active: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
        variants={animated ? pulseVariants : undefined}
        animate={animated ? animationState : undefined}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        <g
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 表盘 */}
          <circle cx="12" cy="13" r="8" />

          {/* 顶部按钮 */}
          <path d="M12 5V2" />
          <path d="M10 2h4" />

          {/* 侧面按钮 */}
          <path d="M18.4 7.6l1.4-1.4" />

          {/* 分针（静止） */}
          <path d="M12 9v4" />

          {/* 秒针（转动） */}
          <motion.line
            x1="12"
            y1="13"
            x2="15"
            y2="13"
            variants={animated ? handVariants : undefined}
            animate={animated ? animationState : undefined}
            style={{ transformOrigin: '12px 13px' }}
          />

          {/* 中心点 */}
          <circle cx="12" cy="13" r="1" fill={color || 'currentColor'} />
        </g>
      </motion.svg>
    );
  }
);

IconTimer.displayName = 'IconTimer';
```

#### 3.4.5 题库图标 (IconProblemBank)

```tsx
// components/icons/problem/IconProblemBank.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 题库图标
 * 语义：表示题目集合/题库
 * 动画：书本翻页效果
 */
export const IconProblemBank = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '题库',
      description = '数学题库',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const pageVariants: Variants = {
      idle: { rotateY: 0 },
      hover: {
        rotateY: [0, -30, 0],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    const bookVariants: Variants = {
      idle: { scale: 1 },
      hover: { scale: 1.05 },
      active: { scale: 0.95 },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
        style={{ perspective: '100px' }}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        <motion.g
          variants={animated ? bookVariants : undefined}
          animate={animated ? animationState : undefined}
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 书本底部 */}
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z" />

          {/* 翻动的页面 */}
          <motion.path
            d="M8 7h8M8 11h6M8 15h4"
            variants={animated ? pageVariants : undefined}
            animate={animated ? animationState : undefined}
            style={{ transformOrigin: '4px 12px' }}
          />

          {/* 数学符号装饰 */}
          <motion.g
            initial={{ opacity: 0.3 }}
            animate={animationState === 'hover' ? { opacity: 1 } : { opacity: 0.3 }}
          >
            <text
              x="15"
              y="9"
              fontSize="5"
              fill={color || 'currentColor'}
              fontFamily="serif"
            >
              ∫
            </text>
          </motion.g>
        </motion.g>
      </motion.svg>
    );
  }
);

IconProblemBank.displayName = 'IconProblemBank';
```

#### 3.4.6 积分符号图标 (IconIntegral)

```tsx
// components/icons/problem/IconIntegral.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 积分符号图标
 * 语义：表示积分题目/Integration Bee
 * 动画：符号描绘效果
 */
export const IconIntegral = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '积分',
      description = '积分符号',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const drawVariants: Variants = {
      idle: {
        pathLength: 1,
        opacity: 1,
      },
      hover: {
        pathLength: [0, 1],
        opacity: 1,
        transition: {
          pathLength: {
            duration: 1,
            ease: 'easeInOut',
          },
        },
      },
    };

    const floatVariants: Variants = {
      idle: { y: 0 },
      hover: {
        y: [-2, 2, -2],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
        variants={animated ? floatVariants : undefined}
        animate={animated ? animationState : undefined}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        <motion.path
          d="M8 4c0 0-2 0-2 3s2 5 2 7s-2 6-2 6c0 2 2 2 2 2"
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          variants={animated ? drawVariants : undefined}
          animate={animated ? animationState : undefined}
        />

        {/* dx 文字 */}
        <motion.text
          x="13"
          y="15"
          fontSize="7"
          fill={color || 'currentColor'}
          fontFamily="serif"
          fontStyle="italic"
          initial={{ opacity: 0.5 }}
          animate={animationState === 'hover' ? { opacity: 1 } : { opacity: 0.5 }}
        >
          dx
        </motion.text>
      </motion.svg>
    );
  }
);

IconIntegral.displayName = 'IconIntegral';
```

#### 3.4.7 加载图标 (IconLoading)

```tsx
// components/icons/feedback/IconLoading.tsx

import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 加载图标
 * 语义：表示加载中状态
 * 动画：流畅的旋转 + 渐变效果
 */
export const IconLoading = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      strokeWidth = 2,
      title = '加载中',
      description = '正在加载',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        <defs>
          <linearGradient id="loading-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color || 'currentColor'} stopOpacity="0" />
            <stop offset="50%" stopColor={color || 'currentColor'} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color || 'currentColor'} stopOpacity="1" />
          </linearGradient>
        </defs>

        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="url(#loading-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray="40 20"
        />
      </motion.svg>
    );
  }
);

IconLoading.displayName = 'IconLoading';
```

#### 3.4.8 太阳图标 (IconSun) - 浅色主题

```tsx
// components/icons/theme/IconSun.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 太阳图标
 * 语义：浅色主题/白天模式
 * 动画：光芒闪烁 + 旋转
 */
export const IconSun = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '浅色模式',
      description = '切换到浅色主题',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const sunVariants: Variants = {
      idle: { scale: 1, rotate: 0 },
      hover: {
        scale: 1.1,
        rotate: 90,
        transition: { duration: 0.5, ease: 'easeOut' },
      },
      active: { scale: 0.9 },
    };

    const rayVariants: Variants = {
      idle: { opacity: 1 },
      hover: {
        opacity: [1, 0.5, 1],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
        variants={animated ? sunVariants : undefined}
        animate={animated ? animationState : undefined}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        <g
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 太阳中心 */}
          <circle cx="12" cy="12" r="4" />

          {/* 光芒 */}
          <motion.g
            variants={animated ? rayVariants : undefined}
            animate={animated ? animationState : undefined}
          >
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </motion.g>
        </g>
      </motion.svg>
    );
  }
);

IconSun.displayName = 'IconSun';
```

#### 3.4.9 月亮图标 (IconMoon) - 深色主题

```tsx
// components/icons/theme/IconMoon.tsx

import { motion, Variants } from 'framer-motion';
import { forwardRef } from 'react';
import { IconProps, iconSizes } from '../types';
import { cn } from '@/utils';

/**
 * 月亮图标
 * 语义：深色主题/夜间模式
 * 动画：星星闪烁 + 轻微摇晃
 */
export const IconMoon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'lg',
      color,
      className,
      animated = true,
      animationState = 'idle',
      strokeWidth = 2,
      title = '深色模式',
      description = '切换到深色主题',
    },
    ref
  ) => {
    const pixelSize = typeof size === 'number' ? size : iconSizes[size];

    const moonVariants: Variants = {
      idle: { rotate: 0 },
      hover: {
        rotate: [-5, 5, -5],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
      active: { scale: 0.9 },
    };

    const starVariants: Variants = {
      idle: { opacity: 0.3, scale: 0.8 },
      hover: {
        opacity: [0.3, 1, 0.3],
        scale: [0.8, 1.2, 0.8],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      },
    };

    return (
      <motion.svg
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', className)}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <desc>{description}</desc>

        {/* 星星 */}
        {animated && (
          <>
            <motion.circle
              cx="19"
              cy="5"
              r="1"
              fill={color || 'currentColor'}
              variants={starVariants}
              animate={animationState}
            />
            <motion.circle
              cx="21"
              cy="10"
              r="0.5"
              fill={color || 'currentColor'}
              variants={starVariants}
              animate={animationState}
              transition={{ delay: 0.3 }}
            />
            <motion.circle
              cx="17"
              cy="8"
              r="0.7"
              fill={color || 'currentColor'}
              variants={starVariants}
              animate={animationState}
              transition={{ delay: 0.6 }}
            />
          </>
        )}

        {/* 月亮 */}
        <motion.path
          d="M12 3a6 6 0 009 9 9 9 0 11-9-9z"
          stroke={color || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={animated ? moonVariants : undefined}
          animate={animated ? animationState : undefined}
        />
      </motion.svg>
    );
  }
);

IconMoon.displayName = 'IconMoon';
```

### 3.5 图标使用规范

```tsx
// 基础使用
import { IconHome, IconCompetition, IconTrophy } from '@/components/icons';

// 静态使用
<IconHome size="lg" />

// 带交互动画
const [isHovered, setIsHovered] = useState(false);

<div
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  <IconCompetition
    size="lg"
    animationState={isHovered ? 'hover' : 'idle'}
  />
</div>

// 加载状态
<IconTimer animationState="loading" />

// 自定义颜色
<IconTrophy color="var(--color-primary-500)" />

// 无障碍使用
<IconProblemBank
  title="题库管理"
  description="点击进入题库管理页面"
/>
```

### 3.6 图标导出

```typescript
// components/icons/index.ts

// 导航类
export * from './navigation';

// 比赛类
export * from './competition';

// 题库类
export * from './problem';

// 认证类
export * from './auth';

// 操作类
export * from './action';

// 反馈类
export * from './feedback';

// 主题类
export * from './theme';

// 其他
export * from './misc';

// 类型
export * from './types';

// 包装器
export { IconWrapper } from './IconWrapper';
```

---

## 四、水滴玻璃风格 (Glassmorphism)

### 4.1 玻璃卡片基础样式

```css
/* 玻璃卡片 - 暗色主题 */
.glass-card-dark {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: var(--radius-xl);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* 玻璃卡片 - 亮色主题 */
.glass-card-light {
  background: rgba(255, 255, 255, 0.70);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-xl);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
```

### 4.2 React 组件实现

```tsx
// components/ui/GlassCard.tsx

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  hover = true,
  padding = 'md',
}) => {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <motion.div
      className={cn(
        // 基础样式
        'relative overflow-hidden',
        'backdrop-blur-xl',
        'border border-[var(--glass-border)]',
        'rounded-3xl',  // 大圆角
        'shadow-lg',
        paddingMap[padding],

        // 变体样式
        variant === 'default' && 'bg-[var(--glass-bg)]',
        variant === 'elevated' && 'bg-[var(--glass-bg)] shadow-xl',
        variant === 'subtle' && 'bg-[var(--surface-default)]',

        className
      )}
      whileHover={hover ? {
        scale: 1.01,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
      } : undefined}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      {/* 玻璃高光效果 */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r
          from-transparent via-white/20 to-transparent"
      />
      {children}
    </motion.div>
  );
};
```

### 4.3 层级系统

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 0: 背景层 (Background)                               │
│  - 纯黑 #000000 / 纯白 #ffffff                              │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 容器层 (Container)                                │
│  - 页面主要容器                                              │
│  - 背景: rgba(255,255,255,0.02) / rgba(0,0,0,0.02)         │
│  - 圆角: 24px                                               │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 卡片层 (Card)                                     │
│  - 内容卡片                                                  │
│  - 背景: rgba(255,255,255,0.05) / rgba(255,255,255,0.70)   │
│  - 模糊: blur(24px)                                         │
│  - 圆角: 24px - 32px                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: 元素层 (Element)                                  │
│  - 按钮、输入框、徽章                                        │
│  - 圆角: 12px - 16px                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: 悬浮层 (Overlay)                                  │
│  - 模态框、下拉菜单、Toast                                   │
│  - 更强的模糊和阴影                                          │
│  - 圆角: 24px - 32px                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、圆角规范

### 5.1 圆角尺寸定义

| Token | 值 | 使用场景 |
|-------|------|----------|
| `radius-xs` | 6px | 小型徽章、标签 |
| `radius-sm` | 10px | 小型按钮、芯片 |
| `radius-md` | 16px | 输入框、中型按钮 |
| `radius-lg` | 24px | 卡片、容器 |
| `radius-xl` | 32px | 大型卡片、模态框 |
| `radius-2xl` | 40px | 特大容器 |
| `radius-full` | 9999px | 圆形按钮、头像 |

### 5.2 使用原则

```tsx
// 页面容器 - 最大圆角
<div className="rounded-[40px]">
  {/* 页面内容 */}
</div>

// 内容卡片 - 大圆角
<GlassCard className="rounded-3xl">  {/* 24px */}
  {/* 卡片内容 */}
</GlassCard>

// 嵌套卡片 - 中等圆角
<div className="rounded-2xl">  {/* 16px */}
  {/* 嵌套内容 */}
</div>

// 按钮 - 中等圆角
<Button className="rounded-xl">  {/* 12px */}
  Click me
</Button>

// 输入框 - 中等圆角
<Input className="rounded-xl" />  {/* 12px */}

// 小型元素 - 小圆角
<Badge className="rounded-lg">New</Badge>  {/* 8px */}
```

---

## 六、动画规范

### 6.1 动画时长

| Token | 值 | 使用场景 |
|-------|------|----------|
| `duration-fast` | 150ms | 微交互（hover、focus） |
| `duration-normal` | 250ms | 标准过渡 |
| `duration-slow` | 400ms | 复杂动画、模态框 |
| `duration-slower` | 600ms | 页面过渡 |

### 6.2 缓动函数

```typescript
// animation.ts

export const easings = {
  // 标准缓动
  default: [0.4, 0, 0.2, 1],

  // 入场动画
  easeOut: [0, 0, 0.2, 1],

  // 出场动画
  easeIn: [0.4, 0, 1, 1],

  // 弹性效果
  spring: [0.175, 0.885, 0.32, 1.275],

  // 柔和弹性
  softSpring: [0.34, 1.56, 0.64, 1],
};

// Framer Motion 配置
export const springConfig = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  snappy: { type: 'spring', stiffness: 300, damping: 20 },
  bouncy: { type: 'spring', stiffness: 400, damping: 10 },
};
```

### 6.3 常用动画预设

```tsx
// animations.tsx

import { Variants } from 'framer-motion';

// 淡入
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

// 向上淡入
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0, 0, 0.2, 1] },
  },
};

// 缩放淡入
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

// 列表项错开动画
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

// 页面过渡
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  enter: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};
```

---

## 七、国际化 (i18n)

### 7.1 目录结构

```
frontend/src/locales/
├── index.ts                    # i18n 配置
├── zh-CN/
│   ├── common.json             # 通用文本
│   ├── auth.json               # 认证相关
│   ├── competition.json        # 比赛相关
│   ├── problem.json            # 题库相关
│   └── validation.json         # 验证消息
└── en-US/
    ├── common.json
    ├── auth.json
    ├── competition.json
    ├── problem.json
    └── validation.json
```

### 7.2 i18n 配置

```typescript
// locales/index.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  'zh-CN': {
    common: () => import('./zh-CN/common.json'),
    auth: () => import('./zh-CN/auth.json'),
  },
  'en-US': {
    common: () => import('./en-US/common.json'),
    auth: () => import('./en-US/auth.json'),
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### 7.3 翻译文件示例

```json
// zh-CN/common.json
{
  "app": {
    "name": "数学比赛平台",
    "tagline": "让数学比赛更有趣"
  },
  "nav": {
    "home": "首页",
    "competitions": "比赛",
    "problemBanks": "题库",
    "settings": "设置"
  },
  "theme": {
    "light": "浅色模式",
    "dark": "深色模式",
    "system": "跟随系统"
  },
  "actions": {
    "save": "保存",
    "cancel": "取消",
    "confirm": "确认",
    "delete": "删除",
    "edit": "编辑",
    "create": "创建",
    "search": "搜索",
    "filter": "筛选",
    "reset": "重置",
    "submit": "提交",
    "back": "返回"
  }
}
```

```json
// en-US/common.json
{
  "app": {
    "name": "Math Competition Platform",
    "tagline": "Make math competitions more fun"
  },
  "nav": {
    "home": "Home",
    "competitions": "Competitions",
    "problemBanks": "Problem Banks",
    "settings": "Settings"
  },
  "theme": {
    "light": "Light Mode",
    "dark": "Dark Mode",
    "system": "System"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "reset": "Reset",
    "submit": "Submit",
    "back": "Back"
  }
}
```

---

## 八、前端架构规范

### 8.1 目录结构

```
frontend/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── app/                    # 应用入口和路由
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── Providers.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # 基础 UI 组件
│   │   ├── icons/              # 动态 SVG 图标
│   │   ├── layout/             # 布局组件
│   │   ├── features/           # 功能组件
│   │   └── common/             # 通用组件
│   │
│   ├── pages/                  # 页面组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── services/               # API 服务
│   ├── store/                  # 状态管理
│   ├── types/                  # TypeScript 类型
│   ├── utils/                  # 工具函数
│   ├── styles/                 # 全局样式
│   ├── locales/                # 国际化
│   ├── config/                 # 配置
│   └── main.tsx
│
├── .eslintrc.js
├── .prettierrc
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### 8.2 命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 组件文件 | PascalCase | `Button.tsx`, `UserCard.tsx` |
| 图标组件 | PascalCase + Icon前缀 | `IconHome`, `IconCompetition` |
| Hook | camelCase + use前缀 | `useAuth`, `useTheme` |
| 工具函数 | camelCase | `formatDate`, `validateEmail` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| CSS 类名 | kebab-case | `glass-card` |

### 8.3 导入顺序

```tsx
// 1. React 相关
import { useState, useEffect } from 'react';

// 2. 第三方库
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// 3. 内部模块 - 绝对路径
import { Button } from '@/components/ui';
import { IconHome } from '@/components/icons';
import { useAuth } from '@/hooks';

// 4. 内部模块 - 相对路径
import { UserCard } from './UserCard';

// 5. 类型导入
import type { User } from '@/types';

// 6. 样式导入
import './User.css';
```

---

## 九、后端架构规范

### 9.1 目录结构

```
backend/
├── src/
│   ├── config/                 # 配置
│   ├── models/                 # 数据模型
│   ├── controllers/            # 控制器
│   ├── services/               # 业务逻辑
│   ├── routes/                 # 路由
│   ├── middlewares/            # 中间件
│   ├── validators/             # 请求验证
│   ├── socket/                 # WebSocket
│   ├── utils/                  # 工具函数
│   ├── types/                  # 类型定义
│   ├── app.ts
│   └── index.ts
│
├── tests/
├── .env.example
├── tsconfig.json
└── package.json
```

### 9.2 API 响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// 分页响应
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 十、Git 规范

### 10.1 分支命名

```
main                    # 主分支
develop                 # 开发分支
feature/auth-login      # 功能分支
bugfix/login-redirect   # Bug 修复
hotfix/security-patch   # 紧急修复
release/1.0.0           # 发布分支
```

### 10.2 Commit 规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式 |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具 |

---

## 十一、设计参考

### 11.1 视觉风格

```
┌─────────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░░  ┌─────────────────────────────────────────────────────┐ ░░ │
│  ░░  │ ◉ Math Competition        [🌙]  [🌐]  [👤 Chester] │ ░░ │
│  ░░  └─────────────────────────────────────────────────────┘ ░░ │
│  ░░                                                          ░░ │
│  ░░  ┌─────────────────────────────────────────────────────┐ ░░ │
│  ░░  │   ╭─────────────────╮   ╭─────────────────╮        │ ░░ │
│  ░░  │   │   📊 比赛管理   │   │   📚 题库管理   │        │ ░░ │
│  ░░  │   │   12 场比赛     │   │   156 道题目    │        │ ░░ │
│  ░░  │   │  [查看详情 →]   │   │  [查看详情 →]   │        │ ░░ │
│  ░░  │   ╰─────────────────╯   ╰─────────────────╯        │ ░░ │
│  ░░  └─────────────────────────────────────────────────────┘ ░░ │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────────────────┘

图例：░░ = 纯黑背景  ╭╮╰╯ = 大圆角玻璃卡片
```

### 11.2 配色

```
主题色（青色）:
  ████████  #2cb1bc  Primary 500
  ████████  #14919b  Primary 600

暗色主题:
  ████████  #000000  Background
  ████████  rgba(255,255,255,0.05)  Glass

亮色主题:
  ████████  #ffffff  Background
  ████████  rgba(255,255,255,0.70)  Glass
```

### 11.3 图标动画状态

```
┌─────────────────────────────────────────────────────────────┐
│   idle        hover         active       loading            │
│                                                             │
│   [🏠]    →   [🏠↕]    →   [🏠⬇]    →   [🏠🔄]              │
│   静止        轻微浮动       按压缩小      旋转加载           │
│                                                             │
│   [🏆]    →   [🏆✨]   →   [🏆⬇]    →   [🏆🔄]              │
│   静止        闪烁发光       按压缩小      旋转加载           │
└─────────────────────────────────────────────────────────────┘
```
