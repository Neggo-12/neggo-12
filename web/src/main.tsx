import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/core/infrastructure/sentry";

initSentry();

createRoot(document.getElementById("root")!).render(<App />);
