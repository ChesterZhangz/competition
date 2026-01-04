# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Math Competition Platform** (数学比赛系统) supporting Integration Bee and other math competition formats. The project is currently in the design phase with documentation only - no code has been implemented yet.

## Documentation Structure

- **design.md** - System functional specifications including:
  - Competition system (on-site and online modes)
  - Problem bank system (题库系统)
  - User authentication system
  - Data models, API endpoints, WebSocket events

- **paradigm.md** - Development standards and design system:
  - UI/UX design principles (Glassmorphism, minimalism)
  - Color system with dark/light theme support
  - Dynamic SVG icon components with animations
  - CSS variables and design tokens
  - i18n (Chinese/English) configuration

## Tech Stack (Planned)

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Zustand, Vite |
| UI | Glassmorphism design, KaTeX for LaTeX rendering |
| Backend | Node.js + Express |
| Real-time | Socket.IO |
| Database | MongoDB + Redis |
| Storage | Tencent Cloud COS |

## Architecture (Planned)

```
project-root/
├── backend/src/
│   ├── models/          # MongoDB schemas
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middlewares/     # Auth, validation
│   ├── socket/          # WebSocket handlers
│   └── validators/      # Request validation
├── frontend/src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── services/        # API clients
│   ├── store/           # Zustand stores
│   ├── hooks/           # Custom hooks
│   ├── locales/         # i18n translations
│   └── styles/          # CSS/styling
└── shared/types/        # Shared TypeScript types
```

## Design System Guidelines

When implementing UI components, follow these principles from paradigm.md:

- **Theme**: Pure black (#000000) / pure white (#ffffff) backgrounds
- **Accent Color**: Cyan (#2cb1bc) as primary
- **Border Radius**: Large rounded corners (16px-40px for cards)
- **Glass Effect**: Use backdrop-filter blur for Glassmorphism
- **Icons**: All SVG icons must be dynamic with animation states (idle, hover, active, loading)
- **Animations**: Use Framer Motion with smooth easing

## Key Features

1. **On-Site Mode**: Host controls via display screen, participants join via QR code
2. **Online Mode**: Automated rules, team support, multiple end conditions
3. **Problem Bank**: LaTeX support, version history, difficulty/tag classification
4. **Auth**: Email/phone login, OAuth (WeChat/GitHub), JWT + Refresh Token
