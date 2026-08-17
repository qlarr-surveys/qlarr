# Qlarr

[Discord 💬](https://discord.gg/9mbRh6SpGj) | [Demo 🖥️](https://console.qlarr.com/) | [Docs 📄](https://qlarr-surveys.github.io/docs/) | [Deploy Locally in 30 Sec! 🚀](https://qlarr-surveys.github.io/docs/guides/deployment/local)

**[Qlarr](https://github.com/qlarr-surveys)** is an open-source framework for creating and running customizable, scientific, and offline-first surveys as code on all platforms. Surveys are defined using JSON to represent UI-agnostic survey components and [JavaScript instructions](https://github.com/qlarr-surveys/survey-engine-script) to represent complex survey logic.

This repository is a monorepo containing the web frontend, the API backend, and deployment orchestration.

## Repository Layout

| Directory | What it is | Docs |
|-----------|------------|------|
| [`frontend/`](frontend) | React web app — WYSIWYG survey editor, survey renderer, and admin GUI | [frontend/README.md](frontend/README.md) |
| [`backend/`](backend) | NestJS API server — survey CRUD, run/navigation, responses, exports, offline sync, auth | [backend/README.md](backend/README.md) |
| [`deploy/`](deploy) | Docker Compose + Caddy to run frontend and backend together | — |

Each app installs independently (its own `package-lock.json`) — there is no root `package.json` or npm workspace. Run frontend commands from `frontend/` and backend commands from `backend/`.

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

## Quick Start

The easiest way to run the full stack locally is with Docker Compose:

```bash
git clone https://github.com/qlarr-surveys/frontend.git qlarr
cd qlarr/deploy
docker-compose up
```

See the [deployment guide](https://qlarr-surveys.github.io/docs/guides/deployment/local) for details. To run either app on its own for development, follow the setup in [`frontend/README.md`](frontend/README.md) or [`backend/README.md`](backend/README.md).

## Architecture

The Qlarr ecosystem is made up of:

1. **[Survey Engine (KMP)](https://github.com/qlarr-surveys/survey-engine-kmp)** — Core UI-agnostic engine that parses survey definitions, generates state machines, and manages survey execution
2. **[Survey Engine Script](https://github.com/qlarr-surveys/survey-engine-script)** — JavaScript validation library for dynamic survey instructions
3. **Backend** ([`backend/`](backend)) — NestJS application exposing REST APIs for survey CRUD, offline sync, auth, and administration
4. **Frontend** ([`frontend/`](frontend)) — React web application for survey editing, rendering, and management
5. **[Android](https://github.com/qlarr-surveys/android)** — Native app that reuses the same Survey Engine to render and run surveys offline

## Contributing

We welcome contributors! The easiest way to get involved:

1. Join our [Discord server](https://discord.gg/9mbRh6SpGj) and talk to us directly
2. For new features: start a Discussion / Idea
3. For bugs: raise an issue with clear steps to reproduce — export the survey with the issue and include it in your bug report

See [CONTRIBUTING.md](CONTRIBUTING.md) for more.

## License

Open-source — see [LICENSE](LICENSE) for details.
