import { AuthProvider, DeviceProvider, ThemeProvider, TRPCProvider } from "@miu2d/shared";
import { LoadingIcon } from "@miu2d/ui";
import { lazy, Suspense } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { PWAUpdatePrompt } from "./PWAUpdatePrompt";
import { RegionalSiteNotice } from "./RegionalSiteNotice";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/landing";
import NotFoundPage from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

const GameScreen = lazy(async () => {
  const m = await import("@miu2d/game");
  return { default: m.GameScreen };
});
const DashboardApp = lazy(async () => {
  const [m] = await Promise.all([
    import("@miu2d/dashboard"),
    import("./monaco-setup"), // Monaco Editor 本地化（仅在 dashboard 加载时初始化）
  ]);
  return { default: m.DashboardApp };
});

export default function App() {
  return (
    <TRPCProvider>
      <AuthProvider>
        <ThemeProvider>
          <DeviceProvider>
            <Router>
              <RegionalSiteNotice />
              <Suspense
                fallback={
                  <div className="flex h-screen w-screen items-center justify-center">
                    <LoadingIcon className="h-8 w-8 text-primary" />
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={import.meta.env.VITE_DEMO_ONLY === "true" ? <Navigate to="/" replace /> : <LoginPage />} />
                  <Route path="/register" element={import.meta.env.VITE_DEMO_ONLY === "true" ? <Navigate to="/" replace /> : <RegisterPage />} />
                  <Route path="/forgot-password" element={import.meta.env.VITE_DEMO_ONLY === "true" ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
                  <Route path="/reset-password" element={import.meta.env.VITE_DEMO_ONLY === "true" ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
                  <Route path="/game/:gameSlug" element={<GameScreen />} />
                  <Route path="/game/:gameSlug/" element={<GameScreen />} />
                  <Route path="/game/:gameSlug/share/:shareCode" element={<GameScreen />} />
                  <Route path="/dashboard/*" element={import.meta.env.VITE_DEMO_ONLY === "true" ? <Navigate to="/" replace /> : <DashboardApp />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Router>
            <PWAUpdatePrompt />
          </DeviceProvider>
        </ThemeProvider>
      </AuthProvider>
    </TRPCProvider>
  );
}
