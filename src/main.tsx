import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { OperationsProvider } from "./state/OperationsContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <OperationsProvider>
        <App />
      </OperationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
