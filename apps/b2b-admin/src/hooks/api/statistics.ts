import { StatisticsContract } from "@repo/contract";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api-client";
import { useAuthStore } from "@/stores/auth-store";

export const statisticsKeys = {
  all: ["statistics"] as const,
  main: () => [...statisticsKeys.all, "main"] as const,
  notifications: () => [...statisticsKeys.all, "notifications"] as const,
};

export function useStatistics() {
  const currentDeptId = useAuthStore((s) => s.currentDeptId);
  return useQuery({
    queryKey: statisticsKeys.main(),
    queryFn: () =>
      api.get<StatisticsContract["Response"]>("/api/v1/statistics"),
    // 🔥 只有当选择了部门后才发起请求
    enabled: !!currentDeptId,
  });
}

export function useNotifications() {
  const currentDeptId = useAuthStore((s) => s.currentDeptId);
  return useQuery({
    queryKey: statisticsKeys.notifications(),
    queryFn: () =>
      api.get<StatisticsContract["NotificationsResponse"]>(
        "/api/v1/statistics/notifications"
      ),
    // 🔥 只有当选择了部门后才发起请求
    enabled: !!currentDeptId,
  });
}
