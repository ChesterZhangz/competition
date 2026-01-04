数学比赛系统设计方案项目概述

设计一个数学比赛模块，支持 Integration Bee（积分蜜蜂大赛）和趣味大题等比赛形式。

一、比赛模式概述
模式 1：现场模式 (On-Site Mode)

场景: 线下比赛，主持人通过大屏幕控制，观众/参赛者通过手机扫码参与
特点: 主持人全权控制比赛节奏、时间、答案公布和积分

模式 2：联机模式 (Online Mode)

场景: 线上比赛，所有人各自在屏幕上看题
特点: 支持团队模式、自动化规则、多种结束条件


二、详细功能设计
2.1 现场模式功能
主持人端功能

比赛创建

设置比赛名称、描述
选择题目来源（从题库选择/手动创建）
设置轮次规则（每轮题目数、每题时间限制）
生成参赛链接和二维码


报名管理

实时显示报名人数和列表
查看参赛者信息（姓名、队伍等）
可开启/关闭报名入口
可移除参赛者


比赛控制

开始/暂停/结束比赛
控制当前题目的计时器（开始/暂停/重置）
手动切换到下一题
公布答案（手动触发）
显示/隐藏排行榜


评分控制

手动设置每题的分值
手动给选手加分/扣分
查看选手答题情况
调整最终积分


大屏展示

当前题目（支持 LaTeX 数学公式）
倒计时器
当前轮次/总轮次
实时排行榜
二维码（报名阶段）



参赛者端功能

报名

扫码进入报名页面
填写信息（姓名、队伍名等自定义字段）
等待比赛开始


答题

查看当前题目
提交答案（在主持人允许的时间内）
查看答案和解析（主持人公布后）
查看自己的积分和排名




2.2 联机模式功能
主持人端功能

比赛创建

设置比赛名称、描述、规则
选择题目和设置分值
设置答题尝试次数限制
设置比赛结束条件：

所有人完成
N 人提交后结束
N 人答对后结束
限时结束




团队设置

开启/关闭团队模式
设置团队人数（2人队伍特殊模式）
两人队伍特殊模式：

模式A：一人看题，一人答题
模式B：只有一人能提交答案




比赛监控

实时查看进度
查看答题统计
手动结束比赛



参赛者端功能

加入比赛

输入比赛码或扫码加入
创建/加入团队（团队模式）


答题

查看题目（根据团队角色）
提交答案（限制次数内）
实时查看进度
查看最终排行榜




三、数据模型设计
3.1 Competition（比赛）
typescriptinterface ICompetition {
  _id: ObjectId;
  title: string;                    // 比赛名称
  description?: string;             // 比赛描述
  type: 'integration_bee' | 'fun_challenge' | 'custom';  // 比赛类型
  mode: 'onsite' | 'online';        // 比赛模式

  // 主持人信息
  hostId: ObjectId;                 // 主持人用户ID

  // 比赛状态
  status: 'draft' | 'registration' | 'ongoing' | 'paused' | 'finished';

  // 比赛码（用于加入）
  joinCode: string;                 // 6位随机码

  // 时间设置
  scheduledStartTime?: Date;        // 预定开始时间
  actualStartTime?: Date;           // 实际开始时间
  endTime?: Date;                   // 结束时间

  // 现场模式特有
  onsiteSettings?: {
    registrationFields: Array<{     // 报名字段
      name: string;
      label: string;
      type: 'text' | 'select' | 'number';
      required: boolean;
      options?: string[];           // select类型的选项
    }>;
    defaultTimePerQuestion: number; // 默认每题时间（秒）
    showLeaderboardDuringMatch: boolean;
  };

  // 联机模式特有
  onlineSettings?: {
    teamEnabled: boolean;           // 是否启用团队
    teamSize: number;               // 团队人数
    twoPersonMode?: 'single_submit' | 'split_view'; // 两人队伍模式
    maxAttempts: number;            // 最大尝试次数
    endCondition: {
      type: 'all_complete' | 'n_submitted' | 'n_correct' | 'time_limit';
      value?: number;               // N人或时间（秒）
    };
  };

  // 题目配置
  rounds: Array<{
    roundNumber: number;
    questions: Array<{
      questionId: ObjectId;         // 引用 CompetitionQuestion
      order: number;
      points: number;               // 该题分值
      timeLimit?: number;           // 该题时限（覆盖默认）
    }>;
  }>;

  // 统计
  stats: {
    participantCount: number;
    teamCount: number;
    submissionCount: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
3.2 CompetitionQuestion（比赛题目）
typescriptinterface ICompetitionQuestion {
  _id: ObjectId;
  competitionId: ObjectId;          // 所属比赛

  // 题目内容
  content: string;                  // Markdown/LaTeX 题目内容
  type: 'integral' | 'limit' | 'series' | 'differential' | 'fun' | 'custom';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';

  // 答案设置
  answerType: 'exact' | 'multiple_choice' | 'numeric_tolerance';
  correctAnswer: string;            // 正确答案
  tolerance?: number;               // 数值容差（numeric_tolerance类型）
  options?: string[];               // 选项（multiple_choice类型）

  // 解析
  solution?: string;                // 解题过程（Markdown/LaTeX）
  hints?: string[];                 // 提示

  // 来源
  sourceType: 'library' | 'custom'; // 来自题库还是自定义
  sourceProblemId?: ObjectId;       // 如果来自题库

  createdAt: Date;
}
3.3 CompetitionParticipant（参赛者）
typescriptinterface ICompetitionParticipant {
  _id: ObjectId;
  competitionId: ObjectId;

  // 用户信息（可能是匿名参赛）
  userId?: ObjectId;                // 已登录用户ID
  guestId?: string;                 // 游客ID（UUID）

  // 报名信息
  registrationData: Record<string, any>;  // 自定义报名字段
  displayName: string;              // 显示名称

  // 团队信息
  teamId?: ObjectId;                // 所属团队
  teamRole?: 'viewer' | 'submitter' | 'both'; // 两人模式的角色

  // 积分
  score: number;                    // 当前总分
  bonusPoints: number;              // 主持人手动加分
  penaltyPoints: number;            // 扣分

  // 状态
  isActive: boolean;                // 是否活跃（未被移除）
  joinedAt: Date;
  lastActiveAt: Date;

  // 设备信息
  deviceFingerprint?: string;
  userAgent?: string;
}
3.4 CompetitionTeam（团队）
typescriptinterface ICompetitionTeam {
  _id: ObjectId;
  competitionId: ObjectId;

  name: string;                     // 团队名称
  captainId: ObjectId;              // 队长（CompetitionParticipant ID）
  members: ObjectId[];              // 成员列表

  // 两人模式角色分配
  roles?: {
    viewerId?: ObjectId;            // 看题者
    submitterId?: ObjectId;         // 答题者
  };

  score: number;                    // 团队总分

  createdAt: Date;
}
3.5 CompetitionSubmission（提交记录）
typescriptinterface ICompetitionSubmission {
  _id: ObjectId;
  competitionId: ObjectId;
  questionId: ObjectId;             // CompetitionQuestion ID

  // 提交者
  participantId: ObjectId;          // CompetitionParticipant ID
  teamId?: ObjectId;                // 团队ID（团队模式）

  // 提交内容
  answer: string;
  attemptNumber: number;            // 第几次尝试

  // 结果
  isCorrect: boolean;
  pointsEarned: number;             // 获得的分数

  // 时间
  submittedAt: Date;
  responseTime: number;             // 答题用时（毫秒）
}
3.6 CompetitionState（比赛实时状态 - 用于WebSocket）
typescriptinterface ICompetitionState {
  competitionId: ObjectId;

  // 当前状态
  currentRound: number;
  currentQuestionIndex: number;

  // 计时器状态
  timerState: 'stopped' | 'running' | 'paused';
  timerStartedAt?: Date;
  timerPausedAt?: Date;
  timerRemainingSeconds: number;

  // 答案状态
  answerRevealed: boolean;

  // 排行榜可见性
  leaderboardVisible: boolean;

  // 最后更新
  updatedAt: Date;
}

四、WebSocket 事件设计
4.1 房间结构
competition-{competitionId}           // 比赛房间（所有参与者）
competition-{competitionId}-host      // 主持人专用房间
competition-{competitionId}-team-{teamId}  // 团队房间
4.2 事件类型
主持人 → 服务器

competition:start - 开始比赛
competition:pause - 暂停比赛
competition:resume - 继续比赛
competition:end - 结束比赛
competition:next-question - 下一题
competition:reveal-answer - 公布答案
competition:timer:start - 开始计时
competition:timer:pause - 暂停计时
competition:timer:reset - 重置计时
competition:update-score - 手动更新分数
competition:kick-participant - 踢出参赛者
competition:toggle-leaderboard - 切换排行榜显示

服务器 → 客户端（广播）

competition:state-update - 状态更新（包含所有状态信息）
competition:question-change - 题目切换
competition:timer-tick - 计时器更新（每秒）
competition:answer-revealed - 答案公布
competition:participant-joined - 新参赛者加入
competition:participant-left - 参赛者离开
competition:submission-received - 收到提交（主持人可见）
competition:leaderboard-update - 排行榜更新
competition:ended - 比赛结束

参赛者 → 服务器

competition:join - 加入比赛
competition:submit-answer - 提交答案
competition:heartbeat - 心跳（保持连接）


五、API 端点设计
5.1 比赛管理
POST   /api/competitions                    # 创建比赛
GET    /api/competitions                    # 获取我的比赛列表
GET    /api/competitions/:id                # 获取比赛详情
PUT    /api/competitions/:id                # 更新比赛设置
DELETE /api/competitions/:id                # 删除比赛

POST   /api/competitions/:id/questions      # 添加题目
PUT    /api/competitions/:id/questions/:qid # 更新题目
DELETE /api/competitions/:id/questions/:qid # 删除题目
POST   /api/competitions/:id/questions/import # 从题库导入题目
5.2 比赛参与
GET    /api/competitions/join/:code         # 通过比赛码获取比赛信息
POST   /api/competitions/join/:code         # 加入比赛（报名）
GET    /api/competitions/:id/me             # 获取我的参赛信息
5.3 团队管理
POST   /api/competitions/:id/teams          # 创建团队
GET    /api/competitions/:id/teams          # 获取团队列表
POST   /api/competitions/:id/teams/:tid/join # 加入团队
PUT    /api/competitions/:id/teams/:tid/roles # 设置角色（两人模式）
5.4 比赛控制（主持人）
POST   /api/competitions/:id/start          # 开始比赛
POST   /api/competitions/:id/pause          # 暂停比赛
POST   /api/competitions/:id/resume         # 继续比赛
POST   /api/competitions/:id/end            # 结束比赛
POST   /api/competitions/:id/next-question  # 下一题
POST   /api/competitions/:id/reveal-answer  # 公布答案
5.5 答题和结果
POST   /api/competitions/:id/submit         # 提交答案
GET    /api/competitions/:id/leaderboard    # 获取排行榜
GET    /api/competitions/:id/results        # 获取最终结果
GET    /api/competitions/:id/my-submissions # 获取我的提交记录

六、前端页面设计
6.1 页面列表
/competitions                           # 比赛列表页
/competitions/create                    # 创建比赛页
/competitions/:id/edit                  # 编辑比赛页
/competitions/:id/host                  # 主持人控制台
/competitions/:id/display               # 大屏展示页（投屏用）
/competitions/:id/join                  # 参赛者加入页
/competitions/:id/play                  # 参赛者答题页
/competitions/:id/results               # 比赛结果页
/join/:code                             # 快速加入页（二维码扫描）
6.2 组件结构
frontend/src/
├── components/
│   └── competition/
│       ├── host/
│       │   ├── HostControlPanel.tsx      # 主持人控制面板
│       │   ├── QuestionSelector.tsx      # 题目选择器
│       │   ├── ParticipantList.tsx       # 参赛者列表
│       │   ├── ScoreEditor.tsx           # 分数编辑器
│       │   └── TimerControl.tsx          # 计时器控制
│       ├── display/
│       │   ├── CompetitionDisplay.tsx    # 大屏展示主组件
│       │   ├── QuestionDisplay.tsx       # 题目展示
│       │   ├── TimerDisplay.tsx          # 倒计时展示
│       │   ├── LeaderboardDisplay.tsx    # 排行榜展示
│       │   └── QRCodeDisplay.tsx         # 二维码展示
│       ├── participant/
│       │   ├── JoinForm.tsx              # 加入表单
│       │   ├── WaitingRoom.tsx           # 等待室
│       │   ├── QuestionView.tsx          # 题目查看
│       │   ├── AnswerInput.tsx           # 答案输入
│       │   └── ResultView.tsx            # 结果查看
│       ├── team/
│       │   ├── TeamCreate.tsx            # 创建团队
│       │   ├── TeamJoin.tsx              # 加入团队
│       │   └── TeamRoleSelector.tsx      # 角色选择
│       └── common/
│           ├── MathRenderer.tsx          # LaTeX数学公式渲染
│           ├── CompetitionCard.tsx       # 比赛卡片
│           └── StatusBadge.tsx           # 状态徽章
├── pages/
│   └── competition/
│       ├── CompetitionListPage.tsx
│       ├── CompetitionCreatePage.tsx
│       ├── CompetitionEditPage.tsx
│       ├── CompetitionHostPage.tsx
│       ├── CompetitionDisplayPage.tsx
│       ├── CompetitionJoinPage.tsx
│       ├── CompetitionPlayPage.tsx
│       └── CompetitionResultsPage.tsx
└── services/
    └── competition/
        ├── competition.api.ts            # REST API
        └── competition.socket.ts         # WebSocket 服务

七、技术实现要点
7.1 实时同步

使用 Socket.IO 房间机制
服务器维护比赛状态（CompetitionState）
状态变化时广播给所有参与者
客户端断线重连时自动同步状态

7.2 计时器实现

服务器端记录开始时间和剩余时间
客户端本地倒计时显示
每秒向服务器发送心跳校准
暂停时记录已用时间

7.3 答案验证

精确匹配：字符串比较
选择题：选项ID比较
数值容差：|用户答案 - 正确答案| <= 容差

7.4 积分计算

基础分：题目设定的分值
速度加成（可选）：剩余时间越多加分越多
手动调整：主持人可加减分

7.5 LaTeX 渲染

使用 KaTeX
支持内联和块级公式
在题目内容中使用 ......
... 和 $$...$$



八、安全考虑

防作弊

设备指纹检测（同一设备多账号）
答案提交时间验证
IP 地址监控


权限控制

只有主持人可以控制比赛
参赛者只能查看自己有权限的内容
团队模式下角色权限分离


数据验证

所有输入进行验证和清理
防止 XSS（LaTeX 内容需谨慎处理）




九、待确认问题

游客参赛：是否允许未登录用户参加比赛？（建议：现场模式允许，联机模式需登录）
题库集成：是否需要创建专门的"比赛题库"，还是使用现有的 SectionQuestion/Problem？
历史记录：比赛结束后数据保留多久？是否需要导出功能？
通知集成：比赛开始前是否需要发送通知提醒？
移动端适配：参赛者端是否需要特别优化移动端体验？
答案格式：Integration Bee 的答案通常是数学表达式，如何验证等价性（如 2x 和 x+x）？


十、实现优先级
Phase 1：核心功能

数据模型和 API 框架
现场模式基本流程
WebSocket 实时通信
主持人控制台
大屏展示

Phase 2：完善功能

联机模式
团队功能
题库集成
移动端优化

Phase 3：增强功能

比赛模板
历史记录和统计
导出功能
高级防作弊


十一、文件结构概览
后端文件
backend/src/
├── models/
│   ├── competition.model.ts
│   ├── competition-question.model.ts
│   ├── competition-participant.model.ts
│   ├── competition-team.model.ts
│   ├── competition-submission.model.ts
│   └── competition-state.model.ts
├── controllers/
│   └── competition.controller.ts
├── routes/
│   └── competition.routes.ts
├── services/
│   └── competition-socket.service.ts
└── validators/
    └── competition.validator.ts
前端文件
frontend/src/
├── components/competition/
│   ├── host/
│   ├── display/
│   ├── participant/
│   ├── team/
│   └── common/
├── pages/competition/
│   ├── CompetitionListPage.tsx
│   ├── CompetitionCreatePage.tsx
│   ├── CompetitionEditPage.tsx
│   ├── CompetitionHostPage.tsx
│   ├── CompetitionDisplayPage.tsx
│   ├── CompetitionJoinPage.tsx
│   ├── CompetitionPlayPage.tsx
│   └── CompetitionResultsPage.tsx
├── services/competition/
│   ├── competition.api.ts
│   └── competition.socket.ts
├── store/
│   └── competition.ts
└── locales/
    ├── zh-CN/pages/competition.json
    └── en-US/pages/competition.json


---

# 题库系统设计方案

## 一、题库系统概述

题库系统是整个比赛平台的核心基础设施，用于管理、组织和复用数学题目。支持多种题目类型，提供分类、标签、难度筛选等功能，并与比赛系统无缝集成。

### 1.1 核心功能

- **题目管理**：创建、编辑、删除、复制题目
- **分类组织**：支持多级分类和标签系统
- **题目搜索**：按类型、难度、标签、关键词搜索
- **版本控制**：题目修改历史记录
- **统计分析**：题目使用频率、正确率统计
- **导入导出**：批量导入/导出题目（JSON、Excel）

### 1.2 权限模型

| 角色 | 权限 |
|------|------|
| 管理员 (admin) | 管理所有题库、审核题目、管理分类 |
| 出题者 (creator) | 创建和管理自己的题目、提交审核 |
| 主持人 (host) | 查看已发布题目、导入到比赛 |
| 普通用户 (user) | 查看公开题库（如有） |

## 二、数据模型设计

### 2.1 ProblemBank（题库）

```typescript
interface IProblemBank {
  _id: ObjectId;

  // 基本信息
  name: string;                     // 题库名称
  description?: string;             // 题库描述
  coverImage?: string;              // 封面图片 URL

  // 所有者
  ownerId: ObjectId;                // 创建者用户ID
  ownerType: 'user' | 'organization'; // 个人/组织

  // 可见性
  visibility: 'private' | 'internal' | 'public';
  // private: 仅自己可见
  // internal: 组织内可见
  // public: 所有人可见

  // 协作者
  collaborators: Array<{
    userId: ObjectId;
    role: 'viewer' | 'editor' | 'admin';
    addedAt: Date;
  }>;

  // 分类设置
  categories: Array<{
    id: string;                     // 唯一标识（UUID）
    name: string;                   // 分类名称
    parentId?: string;              // 父分类ID（支持多级）
    order: number;                  // 排序
  }>;

  // 统计
  stats: {
    problemCount: number;           // 题目总数
    usageCount: number;             // 被使用次数
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Problem（题目）

```typescript
interface IProblem {
  _id: ObjectId;
  bankId: ObjectId;                 // 所属题库

  // 基本信息
  title?: string;                   // 题目标题（可选，用于管理）
  content: string;                  // 题目内容（Markdown/LaTeX）
  contentImages?: string[];         // 题目中的图片 URL

  // 分类
  type: 'integral' | 'limit' | 'series' | 'differential' | 'equation' | 'geometry' | 'algebra' | 'combinatorics' | 'number_theory' | 'fun' | 'custom';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  categoryId?: string;              // 题库内分类
  tags: string[];                   // 标签

  // 答案配置
  answerType: 'exact' | 'multiple_choice' | 'numeric_tolerance' | 'expression' | 'proof';

  // 答案详情（根据 answerType 不同结构）
  answer: {
    // exact 类型
    exactValue?: string;            // 精确答案（LaTeX 格式）

    // multiple_choice 类型
    options?: Array<{
      id: string;
      content: string;              // 选项内容
      isCorrect: boolean;
    }>;

    // numeric_tolerance 类型
    numericValue?: number;
    tolerance?: number;             // 容差
    toleranceType?: 'absolute' | 'relative'; // 绝对/相对容差

    // expression 类型（数学表达式等价）
    expressionValue?: string;       // 标准形式
    equivalentForms?: string[];     // 等价形式列表
  };

  // 解析
  solution?: string;                // 详细解析（Markdown/LaTeX）
  solutionImages?: string[];        // 解析中的图片
  hints?: string[];                 // 提示（可按顺序提供）

  // 来源和元数据
  source?: {
    type: 'original' | 'textbook' | 'competition' | 'other';
    name?: string;                  // 来源名称（如：2023 MIT Integration Bee）
    year?: number;
    chapter?: string;
  };

  // 状态
  status: 'draft' | 'pending_review' | 'published' | 'archived';

  // 创建者
  creatorId: ObjectId;

  // 统计
  stats: {
    usageCount: number;             // 使用次数
    totalAttempts: number;          // 总答题次数
    correctAttempts: number;        // 正确次数
    averageTime?: number;           // 平均答题时间（秒）
  };

  // 版本控制
  version: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 ProblemVersion（题目版本历史）

```typescript
interface IProblemVersion {
  _id: ObjectId;
  problemId: ObjectId;
  version: number;

  // 快照
  snapshot: {
    content: string;
    answer: IProblem['answer'];
    solution?: string;
  };

  // 变更信息
  changedBy: ObjectId;
  changeNote?: string;

  createdAt: Date;
}
```

### 2.4 ProblemTag（标签）

```typescript
interface IProblemTag {
  _id: ObjectId;

  name: string;                     // 标签名
  slug: string;                     // URL 友好的标识
  color?: string;                   // 显示颜色（十六进制）

  // 使用范围
  scope: 'global' | 'bank';         // 全局标签 / 题库私有标签
  bankId?: ObjectId;                // 如果是题库私有

  usageCount: number;               // 使用次数

  createdAt: Date;
}
```

## 三、API 端点设计

### 3.1 题库管理

```
POST   /api/problem-banks                    # 创建题库
GET    /api/problem-banks                    # 获取我的题库列表
GET    /api/problem-banks/:id                # 获取题库详情
PUT    /api/problem-banks/:id                # 更新题库信息
DELETE /api/problem-banks/:id                # 删除题库

# 协作者管理
POST   /api/problem-banks/:id/collaborators  # 添加协作者
DELETE /api/problem-banks/:id/collaborators/:uid # 移除协作者
PUT    /api/problem-banks/:id/collaborators/:uid # 更新协作者权限

# 分类管理
POST   /api/problem-banks/:id/categories     # 添加分类
PUT    /api/problem-banks/:id/categories/:cid # 更新分类
DELETE /api/problem-banks/:id/categories/:cid # 删除分类
PUT    /api/problem-banks/:id/categories/reorder # 重新排序
```

### 3.2 题目管理

```
POST   /api/problems                         # 创建题目
GET    /api/problems                         # 搜索题目（支持筛选）
GET    /api/problems/:id                     # 获取题目详情
PUT    /api/problems/:id                     # 更新题目
DELETE /api/problems/:id                     # 删除题目
POST   /api/problems/:id/duplicate           # 复制题目

# 批量操作
POST   /api/problems/batch/import            # 批量导入
POST   /api/problems/batch/export            # 批量导出
POST   /api/problems/batch/move              # 批量移动到其他分类
POST   /api/problems/batch/tag               # 批量添加标签
DELETE /api/problems/batch                   # 批量删除

# 版本历史
GET    /api/problems/:id/versions            # 获取版本历史
GET    /api/problems/:id/versions/:vid       # 获取特定版本
POST   /api/problems/:id/revert/:vid         # 恢复到特定版本

# 审核（如启用）
POST   /api/problems/:id/submit-review       # 提交审核
POST   /api/problems/:id/approve             # 审核通过
POST   /api/problems/:id/reject              # 审核拒绝
```

### 3.3 标签管理

```
GET    /api/tags                             # 获取标签列表
POST   /api/tags                             # 创建标签
PUT    /api/tags/:id                         # 更新标签
DELETE /api/tags/:id                         # 删除标签
GET    /api/tags/popular                     # 获取热门标签
```

### 3.4 搜索和筛选

```
GET /api/problems?
  bankId=xxx                                 # 指定题库
  &type=integral,limit                       # 题目类型（多选）
  &difficulty=easy,medium                    # 难度（多选）
  &tags=tag1,tag2                           # 标签（多选）
  &categoryId=xxx                           # 分类
  &status=published                         # 状态
  &keyword=积分                              # 关键词搜索
  &sortBy=createdAt                         # 排序字段
  &sortOrder=desc                           # 排序方向
  &page=1                                   # 页码
  &pageSize=20                              # 每页数量
```

## 四、前端页面设计

### 4.1 页面列表

```
/problem-banks                              # 题库列表页
/problem-banks/create                       # 创建题库页
/problem-banks/:id                          # 题库详情/题目列表页
/problem-banks/:id/settings                 # 题库设置页
/problems/create                            # 创建题目页
/problems/:id                               # 题目详情页
/problems/:id/edit                          # 编辑题目页
/problems/:id/preview                       # 题目预览页（模拟答题）
```

### 4.2 组件结构

```
frontend/src/
├── components/
│   └── problem/
│       ├── bank/
│       │   ├── BankCard.tsx                # 题库卡片
│       │   ├── BankSelector.tsx            # 题库选择器
│       │   ├── CategoryTree.tsx            # 分类树
│       │   └── CollaboratorManager.tsx     # 协作者管理
│       ├── editor/
│       │   ├── ProblemEditor.tsx           # 题目编辑器主组件
│       │   ├── ContentEditor.tsx           # 内容编辑器（Markdown/LaTeX）
│       │   ├── AnswerEditor.tsx            # 答案编辑器
│       │   ├── OptionsEditor.tsx           # 选择题选项编辑
│       │   ├── SolutionEditor.tsx          # 解析编辑器
│       │   ├── MetadataEditor.tsx          # 元数据编辑（难度、类型等）
│       │   └── ImageUploader.tsx           # 图片上传
│       ├── list/
│       │   ├── ProblemList.tsx             # 题目列表
│       │   ├── ProblemCard.tsx             # 题目卡片
│       │   ├── ProblemTable.tsx            # 题目表格视图
│       │   ├── FilterPanel.tsx             # 筛选面板
│       │   └── BatchActions.tsx            # 批量操作栏
│       ├── view/
│       │   ├── ProblemView.tsx             # 题目查看
│       │   ├── AnswerReveal.tsx            # 答案展示
│       │   ├── SolutionView.tsx            # 解析展示
│       │   └── VersionHistory.tsx          # 版本历史
│       └── common/
│           ├── DifficultyBadge.tsx         # 难度徽章
│           ├── TypeIcon.tsx                # 类型图标
│           ├── TagInput.tsx                # 标签输入
│           └── MathPreview.tsx             # 数学公式预览
├── pages/
│   └── problem/
│       ├── ProblemBankListPage.tsx
│       ├── ProblemBankCreatePage.tsx
│       ├── ProblemBankDetailPage.tsx
│       ├── ProblemBankSettingsPage.tsx
│       ├── ProblemCreatePage.tsx
│       ├── ProblemEditPage.tsx
│       ├── ProblemDetailPage.tsx
│       └── ProblemPreviewPage.tsx
└── services/
    └── problem/
        ├── problemBank.api.ts
        ├── problem.api.ts
        └── tag.api.ts
```

## 五、技术实现要点

### 5.1 LaTeX 编辑器

- 使用 **Monaco Editor** 或 **CodeMirror** 作为基础编辑器
- 集成 LaTeX 语法高亮
- 实时预览（使用 KaTeX 渲染）
- 支持常用数学符号快捷插入
- 图片拖拽上传

### 5.2 答案验证策略

```typescript
// 答案验证器接口
interface IAnswerValidator {
  validate(userAnswer: string, correctAnswer: IProblem['answer']): {
    isCorrect: boolean;
    score: number;        // 0-1 之间，支持部分得分
    feedback?: string;    // 反馈信息
  };
}

// 不同类型的验证器
class ExactValidator implements IAnswerValidator { }
class NumericValidator implements IAnswerValidator { }
class MultipleChoiceValidator implements IAnswerValidator { }
class ExpressionValidator implements IAnswerValidator { }  // 使用 mathjs 或 CAS
```

### 5.3 数学表达式等价性判断

对于 Integration Bee 等需要判断数学表达式等价性的场景：

- **简单方案**：预定义等价形式列表
- **进阶方案**：使用 **mathjs** 库进行符号计算
- **高级方案**：集成 **Sympy**（Python）或 **Wolfram Alpha API**

### 5.4 导入导出格式

```typescript
// JSON 导出格式
interface IProblemExport {
  version: '1.0';
  exportedAt: string;
  problems: Array<{
    content: string;
    type: string;
    difficulty: string;
    tags: string[];
    answerType: string;
    answer: object;
    solution?: string;
  }>;
}
```

---

# 用户认证系统设计方案

## 一、认证系统概述

用户认证系统提供完整的身份验证和授权功能，支持多种登录方式，确保系统安全性。

### 1.1 支持的认证方式

| 方式 | 说明 |
|------|------|
| 邮箱密码 | 传统的邮箱 + 密码登录 |
| 手机验证码 | 手机号 + 短信验证码 |
| 微信登录 | OAuth 2.0 微信扫码/公众号登录 |
| GitHub 登录 | OAuth 2.0 GitHub 登录 |
| 游客模式 | 临时身份，用于现场比赛 |

### 1.2 核心功能

- **注册登录**：多种方式注册和登录
- **会话管理**：JWT + Refresh Token 机制
- **权限控制**：基于角色的访问控制（RBAC）
- **安全防护**：登录限制、异常检测、设备管理
- **账号管理**：密码修改、邮箱绑定、账号注销

## 二、数据模型设计

### 2.1 User（用户）

```typescript
interface IUser {
  _id: ObjectId;

  // 基本信息
  username: string;                 // 用户名（唯一）
  displayName: string;              // 显示名称
  avatar?: string;                  // 头像 URL
  bio?: string;                     // 个人简介

  // 认证信息
  email?: string;                   // 邮箱（已验证时唯一）
  emailVerified: boolean;
  phone?: string;                   // 手机号（已验证时唯一）
  phoneVerified: boolean;
  passwordHash?: string;            // 密码哈希（bcrypt）

  // 第三方账号绑定
  oauth: {
    wechat?: {
      unionId: string;
      openId: string;
      nickname?: string;
      avatar?: string;
    };
    github?: {
      id: number;
      login: string;
      avatar?: string;
    };
  };

  // 角色和权限
  role: 'user' | 'creator' | 'admin' | 'super_admin';
  permissions?: string[];           // 额外权限

  // 账号状态
  status: 'active' | 'suspended' | 'deleted';
  suspendedUntil?: Date;
  suspendReason?: string;

  // 安全设置
  security: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;       // TOTP 密钥（加密存储）
    loginNotification: boolean;     // 登录通知
    trustedDevices: string[];       // 受信任设备ID列表
  };

  // 偏好设置
  preferences: {
    language: 'zh-CN' | 'en-US';
    theme: 'light' | 'dark' | 'system';
    emailNotifications: boolean;
  };

  // 统计
  stats: {
    competitionsHosted: number;     // 主持比赛数
    competitionsJoined: number;     // 参与比赛数
    problemsCreated: number;        // 创建题目数
  };

  // 时间戳
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Session（会话）

```typescript
interface ISession {
  _id: ObjectId;
  userId: ObjectId;

  // Token 信息
  refreshToken: string;             // Refresh Token（哈希存储）
  accessTokenId: string;            // 当前 Access Token 的 JTI

  // 设备信息
  device: {
    id: string;                     // 设备指纹
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;                     // 操作系统
    browser: string;                // 浏览器
    userAgent: string;
  };

  // IP 信息
  ip: string;
  location?: {
    country: string;
    city: string;
  };

  // 状态
  isActive: boolean;
  lastUsedAt: Date;
  expiresAt: Date;

  createdAt: Date;
}
```

### 2.3 VerificationCode（验证码）

```typescript
interface IVerificationCode {
  _id: ObjectId;

  // 目标
  target: string;                   // 邮箱或手机号
  targetType: 'email' | 'phone';

  // 验证码
  code: string;                     // 6位数字验证码
  purpose: 'register' | 'login' | 'reset_password' | 'bind' | 'verify';

  // 状态
  isUsed: boolean;
  attempts: number;                 // 尝试次数
  maxAttempts: number;              // 最大尝试次数（默认3）

  // 有效期
  expiresAt: Date;                  // 过期时间（默认5分钟）

  createdAt: Date;
}
```

### 2.4 LoginHistory（登录历史）

```typescript
interface ILoginHistory {
  _id: ObjectId;
  userId: ObjectId;

  // 登录方式
  method: 'password' | 'sms' | 'wechat' | 'github' | 'guest';

  // 结果
  success: boolean;
  failReason?: 'wrong_password' | 'user_not_found' | 'account_locked' | 'invalid_code';

  // 设备和位置
  ip: string;
  userAgent: string;
  device?: {
    type: string;
    os: string;
    browser: string;
  };
  location?: {
    country: string;
    city: string;
  };

  createdAt: Date;
}
```

### 2.5 GuestUser（游客用户）

```typescript
interface IGuestUser {
  _id: ObjectId;

  // 游客标识
  guestId: string;                  // UUID
  displayName: string;              // 显示名称（用户输入）

  // 设备绑定
  deviceFingerprint: string;

  // 关联的比赛
  competitionId: ObjectId;

  // 转化（如果游客后来注册）
  convertedToUserId?: ObjectId;

  // 有效期（比赛结束后一段时间自动清理）
  expiresAt: Date;

  createdAt: Date;
}
```

## 三、JWT Token 设计

### 3.1 Access Token（访问令牌）

```typescript
// Header
{
  "alg": "RS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "userId",                  // 用户ID
  "jti": "tokenId",                 // Token ID（用于黑名单）
  "role": "user",                   // 用户角色
  "permissions": [],                // 额外权限
  "sessionId": "xxx",               // 会话ID
  "iat": 1234567890,               // 签发时间
  "exp": 1234567890                // 过期时间（15分钟）
}
```

### 3.2 Refresh Token（刷新令牌）

- 随机生成的安全字符串
- 存储在 HttpOnly Cookie 中
- 有效期 7 天（记住我：30 天）
- 数据库中存储哈希值

### 3.3 Token 刷新流程

```
1. 客户端发现 Access Token 即将过期（或已过期）
2. 携带 Refresh Token 请求 /api/auth/refresh
3. 服务器验证 Refresh Token：
   - 检查是否存在且未过期
   - 检查是否被撤销
   - 验证设备指纹
4. 签发新的 Access Token
5. 可选：轮换 Refresh Token（提高安全性）
```

## 四、API 端点设计

### 4.1 认证相关

```
# 注册
POST   /api/auth/register                   # 邮箱注册
POST   /api/auth/register/phone             # 手机号注册

# 登录
POST   /api/auth/login                      # 邮箱密码登录
POST   /api/auth/login/phone                # 手机验证码登录
POST   /api/auth/login/wechat               # 微信登录
POST   /api/auth/login/github               # GitHub 登录
POST   /api/auth/guest                      # 游客登录（比赛场景）

# Token 管理
POST   /api/auth/refresh                    # 刷新 Access Token
POST   /api/auth/logout                     # 登出（当前设备）
POST   /api/auth/logout-all                 # 登出所有设备

# 验证码
POST   /api/auth/send-code                  # 发送验证码
POST   /api/auth/verify-code                # 验证验证码
```

### 4.2 密码管理

```
POST   /api/auth/forgot-password            # 忘记密码（发送重置邮件）
POST   /api/auth/reset-password             # 重置密码
PUT    /api/auth/change-password            # 修改密码（需要旧密码）
```

### 4.3 账号绑定

```
POST   /api/auth/bind/email                 # 绑定邮箱
POST   /api/auth/bind/phone                 # 绑定手机
POST   /api/auth/bind/wechat                # 绑定微信
POST   /api/auth/bind/github                # 绑定 GitHub
DELETE /api/auth/unbind/:provider           # 解绑第三方账号
```

### 4.4 用户信息

```
GET    /api/users/me                        # 获取当前用户信息
PUT    /api/users/me                        # 更新用户信息
PUT    /api/users/me/avatar                 # 更新头像
DELETE /api/users/me                        # 注销账号

GET    /api/users/:id                       # 获取用户公开信息
GET    /api/users/:id/competitions          # 获取用户的比赛
GET    /api/users/:id/problem-banks         # 获取用户的题库（公开）
```

### 4.5 会话管理

```
GET    /api/sessions                        # 获取所有活跃会话
DELETE /api/sessions/:id                    # 撤销指定会话
GET    /api/login-history                   # 获取登录历史
```

### 4.6 安全设置

```
GET    /api/security/2fa                    # 获取两步验证状态
POST   /api/security/2fa/enable             # 启用两步验证
POST   /api/security/2fa/disable            # 禁用两步验证
POST   /api/security/2fa/verify             # 验证 TOTP 码
```

### 4.7 管理员接口

```
GET    /api/admin/users                     # 获取用户列表
GET    /api/admin/users/:id                 # 获取用户详情
PUT    /api/admin/users/:id/role            # 修改用户角色
PUT    /api/admin/users/:id/status          # 修改用户状态（封禁等）
DELETE /api/admin/users/:id                 # 删除用户
```

## 五、前端页面设计

### 5.1 页面列表

```
/login                                      # 登录页
/register                                   # 注册页
/forgot-password                            # 忘记密码页
/reset-password                             # 重置密码页（带 token）
/oauth/callback/:provider                   # OAuth 回调页

/settings                                   # 设置页（重定向到 /settings/profile）
/settings/profile                           # 个人资料设置
/settings/account                           # 账号设置（邮箱、手机、密码）
/settings/security                          # 安全设置（两步验证、登录历史）
/settings/sessions                          # 设备管理

/users/:id                                  # 用户公开主页

/admin/users                                # 管理员 - 用户管理
```

### 5.2 组件结构

```
frontend/src/
├── components/
│   └── auth/
│       ├── forms/
│       │   ├── LoginForm.tsx               # 登录表单
│       │   ├── RegisterForm.tsx            # 注册表单
│       │   ├── PhoneLoginForm.tsx          # 手机登录表单
│       │   ├── ForgotPasswordForm.tsx      # 忘记密码表单
│       │   ├── ResetPasswordForm.tsx       # 重置密码表单
│       │   └── GuestForm.tsx               # 游客表单
│       ├── oauth/
│       │   ├── OAuthButtons.tsx            # 第三方登录按钮组
│       │   ├── WechatQRCode.tsx            # 微信扫码
│       │   └── OAuthCallback.tsx           # OAuth 回调处理
│       ├── verification/
│       │   ├── CodeInput.tsx               # 验证码输入
│       │   ├── SendCodeButton.tsx          # 发送验证码按钮
│       │   └── TOTPInput.tsx               # 两步验证输入
│       ├── session/
│       │   ├── SessionList.tsx             # 会话列表
│       │   ├── SessionCard.tsx             # 会话卡片
│       │   └── LoginHistoryTable.tsx       # 登录历史表格
│       └── common/
│           ├── PasswordStrength.tsx        # 密码强度指示器
│           ├── AvatarUpload.tsx            # 头像上传
│           └── ProtectedRoute.tsx          # 路由守卫
├── pages/
│   └── auth/
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       ├── ForgotPasswordPage.tsx
│       ├── ResetPasswordPage.tsx
│       ├── OAuthCallbackPage.tsx
│       └── settings/
│           ├── ProfileSettingsPage.tsx
│           ├── AccountSettingsPage.tsx
│           ├── SecuritySettingsPage.tsx
│           └── SessionsPage.tsx
├── store/
│   └── auth.ts                             # 认证状态管理
└── services/
    └── auth/
        ├── auth.api.ts                     # 认证 API
        ├── user.api.ts                     # 用户 API
        └── token.service.ts                # Token 管理服务
```

## 六、安全实现要点

### 6.1 密码安全

```typescript
// 密码哈希（使用 bcrypt）
const SALT_ROUNDS = 12;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

// 密码验证
const isValid = await bcrypt.compare(inputPassword, passwordHash);
```

### 6.2 密码强度要求

- 最小长度：8 字符
- 必须包含：大写字母、小写字母、数字
- 可选要求：特殊字符
- 不能与用户名、邮箱相同
- 不能是常见弱密码

### 6.3 登录限制

```typescript
// 登录失败限制
const LOGIN_LIMITS = {
  maxAttempts: 5,                   // 最大尝试次数
  lockDuration: 15 * 60 * 1000,     // 锁定时间（15分钟）
  resetAfter: 60 * 60 * 1000,       // 计数重置时间（1小时）
};

// IP 限制
const IP_LIMITS = {
  maxAttemptsPerIP: 20,             // 每 IP 最大尝试
  windowMs: 15 * 60 * 1000,         // 时间窗口（15分钟）
};
```

### 6.4 验证码安全

- 6 位数字，5 分钟有效
- 同一目标 60 秒内只能发送一次
- 每日发送上限：10 条
- 验证失败 3 次后失效
- 使用后立即失效

### 6.5 Session 安全

- Refresh Token 轮换
- 异常登录检测（新设备、新地点）
- 支持远程登出
- 自动清理过期会话

### 6.6 CORS 配置

```typescript
const corsOptions = {
  origin: ['https://yourdomain.com'],
  credentials: true,                // 允许携带 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};
```

## 七、中间件设计

### 7.1 认证中间件

```typescript
// 验证 Access Token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 可选认证（游客也可访问）
const optionalAuth = async (req, res, next) => {
  // 类似 authenticate，但不抛错
};
```

### 7.2 权限中间件

```typescript
// 检查角色
const requireRole = (...roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// 检查权限
const requirePermission = (...permissions: string[]) => {
  return (req, res, next) => {
    const hasPermission = permissions.every(p =>
      req.user.permissions?.includes(p) ||
      ROLE_PERMISSIONS[req.user.role]?.includes(p)
    );
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

## 八、文件结构概览

### 后端文件

```
backend/src/
├── models/
│   ├── user.model.ts
│   ├── session.model.ts
│   ├── verification-code.model.ts
│   ├── login-history.model.ts
│   └── guest-user.model.ts
├── controllers/
│   ├── auth.controller.ts
│   └── user.controller.ts
├── routes/
│   ├── auth.routes.ts
│   └── user.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── token.service.ts
│   ├── email.service.ts
│   ├── sms.service.ts
│   └── oauth/
│       ├── wechat.service.ts
│       └── github.service.ts
├── middlewares/
│   ├── authenticate.ts
│   ├── authorize.ts
│   └── rate-limit.ts
├── validators/
│   ├── auth.validator.ts
│   └── user.validator.ts
└── utils/
    ├── password.ts
    ├── jwt.ts
    └── device.ts
```

### 前端文件

```
frontend/src/
├── components/auth/
│   ├── forms/
│   ├── oauth/
│   ├── verification/
│   ├── session/
│   └── common/
├── pages/auth/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── OAuthCallbackPage.tsx
│   └── settings/
├── store/
│   └── auth.ts
├── services/auth/
│   ├── auth.api.ts
│   ├── user.api.ts
│   └── token.service.ts
├── hooks/
│   ├── useAuth.ts
│   └── useUser.ts
└── guards/
    └── AuthGuard.tsx
```

---

# 系统整体架构

## 一、技术栈选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化开发 |
| 状态管理 | Zustand | 轻量级状态管理 |
| UI 组件库 | Ant Design / Shadcn UI | 企业级组件 |
| 数学渲染 | KaTeX | LaTeX 公式渲染 |
| 后端框架 | Node.js + Express | RESTful API |
| 实时通信 | Socket.IO | WebSocket 封装 |
| 数据库 | MongoDB | 文档数据库 |
| 缓存 | Redis | 会话、验证码、限流 |
| 对象存储 | 腾讯云 COS / 阿里云 OSS | 图片存储 |
| 部署 | Docker + Nginx | 容器化部署 |

## 二、项目目录结构

```
project-root/
├── backend/
│   ├── src/
│   │   ├── models/                 # 数据模型
│   │   ├── controllers/            # 控制器
│   │   ├── routes/                 # 路由
│   │   ├── services/               # 业务逻辑
│   │   ├── middlewares/            # 中间件
│   │   ├── validators/             # 请求验证
│   │   ├── utils/                  # 工具函数
│   │   ├── config/                 # 配置文件
│   │   ├── socket/                 # WebSocket 处理
│   │   └── index.ts                # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/             # 组件
│   │   ├── pages/                  # 页面
│   │   ├── services/               # API 服务
│   │   ├── store/                  # 状态管理
│   │   ├── hooks/                  # 自定义 Hooks
│   │   ├── utils/                  # 工具函数
│   │   ├── styles/                 # 样式文件
│   │   ├── locales/                # 国际化
│   │   └── App.tsx                 # 根组件
│   ├── package.json
│   └── vite.config.ts
├── shared/                         # 前后端共享类型
│   └── types/
├── docker-compose.yml
└── README.md
```

## 三、环境变量配置

```env
# .env.example

# 服务器
PORT=3000
NODE_ENV=development

# 数据库
MONGODB_URI=mongodb://localhost:27017/competition

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_TOKEN_EXPIRES=7d

# OAuth - 微信
WECHAT_APP_ID=xxx
WECHAT_APP_SECRET=xxx

# OAuth - GitHub
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# 短信服务（腾讯云）
TENCENT_SMS_SECRET_ID=xxx
TENCENT_SMS_SECRET_KEY=xxx
TENCENT_SMS_APP_ID=xxx
TENCENT_SMS_SIGN=xxx

# 邮件服务
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=xxx
SMTP_PASS=xxx

# 对象存储
COS_SECRET_ID=xxx
COS_SECRET_KEY=xxx
COS_BUCKET=xxx
COS_REGION=xxx
```

## 四、实现优先级（总体）

### Phase 1: 基础设施
1. 项目初始化和基础架构
2. 用户认证系统（邮箱注册登录）
3. 基础题库功能（创建、编辑、查看题目）

### Phase 2: 核心比赛功能
1. 现场模式比赛流程
2. WebSocket 实时通信
3. 主持人控制台和大屏展示
4. 参赛者答题界面

### Phase 3: 完善功能
1. 联机模式和团队功能
2. 第三方登录（微信、GitHub）
3. 题目批量导入导出
4. 移动端适配

### Phase 4: 高级功能
1. 两步验证
2. 比赛模板和历史记录
3. 数据统计和报表
4. 高级防作弊机制
