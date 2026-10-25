/**
 * context/AuthContext.tsx
 * Provides auth state (current user + loading) to the whole app.
 * Business logic for login/logout lives in the service layer, not here.
 */
import {
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usersResource } from "@/api";
import { authResource } from "@/api";
import { tokenService } from "@/services/token.service";
import { AuthContext } from "./auth-context";
import type { ApiUser } from "@/types/api";
import { socketInstance } from "@/api/socket.instance";
import { ROUTES } from "@/config/routes.config";

// ── Context shape ─────────────────────────────────────────────────────────────

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenService.hasTokens()) {
      setLoading(false);
      return;
    }
    try {
      const me = await usersResource.me();
      setUser(me);
    } catch {
      tokenService.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Trong AuthProvider của AuthContext.tsx
  // Trong AuthContext.tsx
  const login = async (data: { email: string; password: string }) => {
    try {
      // 1. Gọi lấy token
      const tokens = await authResource.login(data);
      tokenService.setTokens(tokens);

      // 2. 🔥 CỰC KỲ QUAN TRỌNG: Phải delay 1 nhịp nhỏ để localStorage kịp lưu Token trước khi gọi /me
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 3. Lấy thông tin user
      const me = await usersResource.me();
      setUser(me);

      // 4. Kết nối socket và đóng trạng thái loading
      socketInstance.connect();
      setLoading(false); // Đảm bảo gỡ màn hình chờ
    } catch (error) {
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    const refreshToken = tokenService.getRefreshToken();
    if (refreshToken) {
      await authResource.logout(refreshToken).catch(() => {
        /* best-effort */
      });
    }
    tokenService.clearTokens();
    socketInstance.disconnect();

    setUser(null);

    window.location.href = ROUTES.AUTH;
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
