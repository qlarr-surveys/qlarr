# CLAUDE.md

## Project Overview
Qlarr Frontend is a React-based web application for creating, managing, and running surveys using the Qlarr Survey Engine DSL. It provides:
1. A WYSIWYG editor for building surveys in the Survey Engine DSL
2. A survey renderer used in both web and Android apps
3. Admin GUI for survey management, user management, login, cloning, etc.

Surveys are defined as JSON (UI-agnostic components) with JavaScript instructions for complex logic.

## Tech Stack
- **Framework**: React 18, JavaScript (JSX — no TypeScript)
- **Build tool**: Vite 5
- **UI library**: MUI v5 with Emotion CSS-in-JS
- **State management**: Redux Toolkit (two stores: `runStore` for survey responses, `manageStore` for survey editing)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Yup validation
- **HTTP client**: Axios with JWT auth interceptors (access + refresh token rotation)
- **i18n**: i18next — supported languages: en, ar, de, es, pt, fr, nl (RTL support for Arabic)
- **Rich text editor**: TipTap
- **Drag & drop**: react-dnd

## Repo Layout
The repo holds two independent apps plus shared orchestration:
```
frontend/   # this React app (source, build config, Dockerfile) — details below
backend/    # NestJS survey backend (its own package.json + lockfile)
deploy/     # docker-compose + Caddy for deploying both
.github/    # CI workflows
```
Each app installs independently (its own `package-lock.json`); there is no root
`package.json` / npm workspace. Run frontend commands from `frontend/`.

## Frontend Structure (`frontend/`)
```
src/
  components/    # UI components organized by feature (auth, common, design, manage, run, Questions)
  pages/         # Page-level components (ManageSurvey, RunSurvey, Dashboard, etc.)
  state/         # Redux slices (designState, runState, editState, templateState)
  services/      # API service classes (AuthService, SurveyService, DesignService, RunService, etc.)
  networking/    # Axios instances (authenticatedApi, publicApi) and endpoint definitions
  hooks/         # Custom React hooks (useBoolean, useResponsive, useNamespaceLoader, etc.)
  theme/         # MUI theme config (palette, typography, shadows, RTL)
  constants/     # App constants (design rules, roles, component types, validation options)
  utils/         # Utility functions (error processing, date formatting, design utilities)
  layouts/       # Layout components
  assets/        # Static assets
  styles/        # Global CSS
```

**Entry points**: `index.jsx` → `App.jsx` → `Web.jsx` (web) / `Android.jsx` (android) → `routes.js`
**Store config**: `store.js` (defines both `runStore` and `manageStore`)

## Path Aliases
`~/` maps to `src/` (configured in `jsconfig.json`)

## Development
- Run all frontend commands from the `frontend/` directory
- **Package manager**: npm
- **Node version**: 16+
- Copy `.env.example` to `.env` and set `VITE_BE_URL` to point to the backend API

### Commands
| Command | Purpose |
|---------|---------|
| `npm start` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run build-staging` | Staging build (ES2018, sourcemaps) |
| `npm run build-android` | Android build (ES2015, minified) |
| `npm run build-android-debuggable` | Android debug build |
| `npm run serve` | Preview production build |

### Environment Variables
```
VITE_FRONT_END_HOST=localhost:3000
VITE_PROTOCOL=http
VITE_BE_URL=http://localhost:8080/
```

## Code Conventions
- **Components**: Functional only, `React.memo` for optimization, PascalCase file/folder names
- **Barrel exports**: `index.jsx` files in component folders
- **Styling**: MUI `sx` prop and CSS modules (`.module.css`)
- **Forms**: RHF wrapper components in `components/hook-form/` (RHFTextField, RHFSelect, RHFCheckbox, etc.)
- **State**: Redux Toolkit slices in `state/`, custom debounced save middleware for auto-saving
- **Services**: Class-based service layer in `services/` with a `BaseService` for common error handling
- **Auth**: JWT Bearer tokens via Axios interceptors, automatic token refresh on 401
- **Lazy loading**: Route-based with React.lazy + Suspense

## PR Conventions
- PR titles MUST use semantic/conventional commit prefixes (enforced by `.github/workflows/lint-pr.yaml`)
- Valid prefixes: `fix:`, `feat:`, `refactor:`, `chore:`, `docs:`, `style:`, `perf:`, `test:`, `build:`, `ci:`, `revert:`
- Example: `fix: sidebar icon ripple area` or `feat: add new survey type`

## Deployment
- **Docker**: Multi-stage Dockerfile (Node 18 build → Nginx serve on port 80)
- **Production**: Use the docker-compose from the backend repo to deploy both frontend and backend
