import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const SW_CLEANUP_FLAG = "sw-cleanup-v1";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      const cacheKeys = "caches" in window ? await caches.keys() : [];
      const shouldReload =
        (registrations.length > 0 || cacheKeys.length > 0) && !sessionStorage.getItem(SW_CLEANUP_FLAG);

      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
      }

      if (shouldReload) {
        sessionStorage.setItem(SW_CLEANUP_FLAG, "done");
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
