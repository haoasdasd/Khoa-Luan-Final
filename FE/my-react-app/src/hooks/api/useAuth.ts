// hooks/api/useAuth.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authResource, usersResource } from "@/api";
import { tokenService } from "@/services/token.service";
import type {
  ApiLoginPayload,
  ApiRegisterPayload,
  ApiResetPasswordPayload,
} from "@/types/api";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // 1. Lấy thông tin user hiện tại (Thay thế fetchMe cũ)
  const { data: user, isLoading: loading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      if (!tokenService.hasTokens()) return null;
      return await usersResource.me();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache 5 phút
  });

  const loginMutation = useMutation({
    mutationFn: (payload: ApiLoginPayload) => authResource.login(payload),
    onSuccess: async (tokens) => {
      tokenService.setTokens(tokens);
      // Thay vì fetchQuery, hãy set trực tiếp vào Cache để UI phản ứng ngay lập tức
      const userData = await usersResource.me();
      queryClient.setQueryData(["me"], userData);

      navigate("/", { replace: true });
    },
  });

  // 3. Mutation Đăng ký
  const registerMutation = useMutation({
    mutationFn: (payload: ApiRegisterPayload) => authResource.register(payload),
  });

  // 4. Mutation Đăng xuất
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const rt = tokenService.getRefreshToken();
      if (rt) await authResource.logout(rt);
    },
    onSuccess: () => {
      tokenService.clearTokens();
      queryClient.setQueryData(["me"], null); // Xóa dữ liệu user khỏi cache
      window.location.href = "/auth/login";
    },
  });

  // 5. Quên mật khẩu & Reset
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authResource.forgotPassword({ email }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: ApiResetPasswordPayload) =>
      authResource.resetPassword(payload),
  });

  return {
    user,
    loading,
    isAuthenticated: !!user,
    // Trả về các hàm tiện ích cho UI
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    // Trạng thái loading của từng nút bấm
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
