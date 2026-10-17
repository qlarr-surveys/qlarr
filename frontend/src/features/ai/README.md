# `features/ai` — the fork seam

Qlarr ships in two flavours: this open-source repo, which has no AI service, and
the hosted fork, which does. Rather than let that difference spread through the
dashboard, it is confined to the files in this folder.

`dashboardAction.js` exports `useAiDashboardAction()`. Here it returns `null`,
so `useDashboardActions()` yields two cards. The fork replaces the same file and
returns a card descriptor:

```js
{ key, titleKey, descriptionKey, icon, tone: "ai", onClick }
```

Two rules keep the merge cheap:

- **The grid never branches on the number of cards.** It is
  `repeat(auto-fit, minmax(260px, 1fr))`, which renders two or three cards as
  equal columns from identical CSS.
- **`tone: "ai"` is styled here even though nothing in this repo uses it.** The
  fork adds a card, not a stylesheet.

There is deliberately no disabled "coming soon" card. Self-hosted installs will
never have the service, and advertising a dead feature is worse than omitting it.
