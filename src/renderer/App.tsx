import React from "react";
import { createRoot } from "react-dom/client";
import { CaptureRenderer } from "./components/CaptureRenderer";
import { OverlayApp } from "./app/OverlayApp";
import "./styles.css";
import "./i18n";

function App() {
  const isCapture = new URLSearchParams(window.location.search).get("capture") === "1";
  return isCapture ? <CaptureRenderer /> : <OverlayApp />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
