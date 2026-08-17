# Qlarr Frontend

[Discord 💬](https://discord.gg/9mbRh6SpGj) | [Demo 🖥️](https://console.qlarr.com/) | [Docs 📄](https://qlarr-surveys.github.io/docs/) | [Deploy Locally in 30 Sec! 🚀](https://qlarr-surveys.github.io/docs/guides/deployment/local)

The React web application for **[Qlarr](https://github.com/qlarr-surveys)** — an open-source framework for creating and running customizable, scientific, and offline-first surveys as code on all platforms. Surveys are defined using JSON to represent UI-agnostic survey components and [JavaScript instructions](https://github.com/qlarr-surveys/survey-engine-script) to represent complex survey logic.

> This is the **frontend** app of the Qlarr monorepo. For the repo overview (frontend + backend + deploy), see the [root README](../README.md). For the API server, see the [backend README](../backend/README.md).

## Key Features

- 📄 **Survey As Code** — Write survey structure in JSON, and survey logic in JavaScript
- 📴 **Offline-First Design** — Collect data anywhere without internet connectivity
- ⍰ **Conditional Logic & Skip Logic** — Advanced branching based on user responses
- ✅ **Input Validation** — Ensure data quality with built-in validation checks
- 🎲 **Randomization & Sampling** — Randomize questions and options with weighted priorities
- 🌐 **Multilingual Surveys** — Support for multiple languages
- 🔗 **Piping** — Reference and display values from previous answers
- ⬅️➡️ **Flexible Navigation** — All questions, page-by-page, or question-by-question
- 🎨 **Conditional Formatting** — Dynamic styling based on responses
- ⏱️📊 **Time Limits & Scoring** (WIP) — Perfect for quizzes and timed assessments

## What It Does

- **WYSIWYG Survey Editor** — Create and edit surveys using the Qlarr [Survey Engine](https://github.com/qlarr-surveys/survey-engine-kmp) DSL
- **Survey Renderer** — Render and run surveys powered by the Survey Engine (used in both Web and [Android](https://github.com/qlarr-surveys/android) apps)
- **Admin GUI** — Survey management, user management, login, cloning, and other administrative functionalities exposed by the [backend](../backend/README.md)

## Tech Stack

- React 18
- Vite 5
- MUI v5
- Redux Toolkit
- React Router v6
- i18next (en, ar, de, es, pt, fr, nl)

## Quick Start

### Using Docker (Recommended)

The easiest way to run Qlarr is with the Docker Compose setup in [`deploy/`](../deploy), which brings up both frontend and backend:

```bash
git clone https://github.com/qlarr-surveys/frontend.git qlarr
cd qlarr/deploy
docker-compose up
```

See the [deployment guide](https://qlarr-surveys.github.io/docs/guides/deployment/local) for more details.

### Local Development

**Prerequisites:** Node.js 16+, npm

```bash
# Clone the repository
git clone https://github.com/qlarr-surveys/frontend.git qlarr

# Enter the frontend app
cd qlarr/frontend

# Install dependencies
npm install

# Configure environment
# Edit public/config.js to set BE_URL to point to the backend API

# Run the development server
npm start
```

The application will be available at `http://localhost:3000`. It expects the [backend](../backend/README.md) to be running (default `http://localhost:8080`).

### Build

```bash
# Production build
npm run build

# Staging build (ES2018, sourcemaps)
npm run build-staging

# Android build (ES2015, minified)
npm run build-android
```

## Architecture

This frontend is one component of the Qlarr ecosystem:

1. **[Survey Engine (KMP)](https://github.com/qlarr-surveys/survey-engine-kmp)** — Core UI-agnostic engine that parses survey definitions, generates state machines, and manages survey execution
2. **[Survey Engine Script](https://github.com/qlarr-surveys/survey-engine-script)** — JavaScript validation library for dynamic survey instructions
3. **[Backend](../backend/README.md)** — NestJS application exposing REST APIs for survey CRUD, offline sync, auth, and administration
4. **Frontend** (this app) — React web application for survey editing, rendering, and management

## Contributing

We welcome contributors! The easiest way to get involved:

1. Join our [Discord server](https://discord.gg/9mbRh6SpGj) and talk to us directly
2. For new features: start a Discussion / Idea
3. For bugs: raise an issue with clear steps to reproduce — export the survey with the issue and include it in your bug report

## License

Open-source — see [LICENSE](../LICENSE) for details.
