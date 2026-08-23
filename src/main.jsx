import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { TradeProvider } from "./context/TradeContext";
import "./styles/global.css";
import "./styles/trades.css";
import "./styles/analytics.css";
import "./styles/refinement.css";
import "./styles/editor.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TradeProvider>
      <App />
    </TradeProvider>
  </StrictMode>,
);
