import React from "react";

import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";

import * as serviceWorker from "./serviceWorker";
import App from "./App";

import "./index.css";
import "./styles/global-styles.css";
import "./styles/safe-area.css";

// After a deploy, an open tab asks for chunk files that no longer exist.
// Reload to pick up the new build. Capped per tab so a chunk that stays
// missing can never cause a reload loop.
const MAX_CHUNK_RELOADS = 3;
window.addEventListener("vite:preloadError", (event) => {
  try {
    const reloads = Number(sessionStorage.getItem("chunk-reloads")) || 0;
    if (reloads >= MAX_CHUNK_RELOADS) return;
    sessionStorage.setItem("chunk-reloads", String(reloads + 1));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Router>
    <App />
  </Router>
);

serviceWorker.unregister();
