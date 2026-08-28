import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import { App } from "./App";
import { PwaProvider } from "./features/pwa/PwaProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaProvider>
      <App />
    </PwaProvider>
  </StrictMode>,
);
