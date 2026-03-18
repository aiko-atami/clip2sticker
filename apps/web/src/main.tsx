import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/app/styles/index.css";
import "./style.css";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Root container #app was not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
