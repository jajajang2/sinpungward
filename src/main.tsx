import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA 서비스워커: 미리보기/iframe 환경에서는 등록하지 않음
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
