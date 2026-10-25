/**
 * router/AppRouter.tsx
 * Declarative route map. Adding a new page = one line here + one page file.
 * Route paths come from ROUTES config — no magic strings.
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { GuestRoute } from "./GuestRoute";
import { ROUTES } from "@/config/routes.config";
import LoginPage from "@/pages/Auth/LoginPage";
import RegisterPage from "@/pages/Auth/RegisterPage";
import ForgotPasswordPage from "@/pages/Auth/ForgotPasswordPage";
import FeedPage from "@/pages/Feed/FeedPage";
import ProfilePage from "@/pages/Profile/ProfilePage";
import ChatPage from "@/pages/chat/ChatPage";
import FriendsPage from "@/pages/Friends/FriendsPage";
import SavedPostsPage from "@/pages/Feed/SavedPostsPage";
// Placeholder for pages not yet built
function ComingSoon({ name }: { name: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "calc(100vh - 100px)",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 48 }}>🚧</div>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>{name}</h2>
      <p style={{ color: "var(--color-text-2)" }}>Coming soon…</p>
    </div>
  );
}
// Thêm import Layout vào đầu file
import { MainLayout } from "@/components/Layout/MainLayout"; 

export function AppRouter() {
  return (
    <Routes>
      {/* ── Public / Guest Routes (Giữ nguyên) ── */}
      <Route path={ROUTES.AUTH} element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/auth/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/auth/forgot" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

      {/* ── Protected Routes Với Header Toàn Cục ── */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout /> {/* Header nằm ở đây */}
          </ProtectedRoute>
        }
      >
        {/* Tất cả các trang bên trong này sẽ tự động có Header */}
        <Route path={ROUTES.FEED} element={<FeedPage />} />
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.PROFILE_USER} element={<ProfilePage />} />
        <Route path={ROUTES.CHAT} element={<ChatPage />} />
        <Route path={ROUTES.CHAT_CONVERSATION} element={<ChatPage />} />
        <Route path={ROUTES.FRIENDS} element={<FriendsPage />} />
        <Route path={ROUTES.SAVED} element={<SavedPostsPage />} />
        
        {/* Các trang Coming Soon */}
        <Route path={ROUTES.GROUPS} element={<ComingSoon name="Groups" />} />
        <Route path={ROUTES.MARKETPLACE} element={<ComingSoon name="Marketplace" />} />
        <Route path={ROUTES.WATCH} element={<ComingSoon name="Watch" />} />
        <Route path={ROUTES.MEMORIES} element={<ComingSoon name="Memories" />} />
        <Route path={ROUTES.EVENTS} element={<ComingSoon name="Events" />} />
        <Route path={ROUTES.GAMING} element={<ComingSoon name="Gaming" />} />
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to={ROUTES.FEED} replace />} />
      <Route path="*" element={<Navigate to={ROUTES.FEED} replace />} />
    </Routes>
  );
}