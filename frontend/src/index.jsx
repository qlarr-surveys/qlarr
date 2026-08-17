import React from "react";

import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";

import * as serviceWorker from "./serviceWorker";
import App from "./App";

import "./index.css";
import "./styles/global-styles.css";
import "./styles/safe-area.css";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Router>
    <App />
  </Router>
);

serviceWorker.unregister();
