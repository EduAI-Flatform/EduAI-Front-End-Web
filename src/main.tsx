import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import { App } from "./App";
import { PwaProvider } from "./features/pwa/PwaProvider";
import { PlatformProvider } from "./features/platform/PlatformProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformProvider><PwaProvider>
      <App />
    </PwaProvider></PlatformProvider>
  </StrictMode>,
);
