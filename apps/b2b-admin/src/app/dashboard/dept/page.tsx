"use client";

import {
  Building2,
  CheckCircle,
  Loader2,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HasRole } from "@/components/auth";
import { CreateDepartmentModal } from "@/components/form/CreateDepartmentModal";
import { EditDepartmentModal } from "@/components/form/EditDepartmentModal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  useDeleteDepartment,
  useDepartmentDetail,
  useDepartmentList,
} from "@/hooks/api/department";

export default function UsersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  // ✅ 1. 统一使用这个 ID 作为编辑源
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(
    undefined
  );

  const {
    data: departmentsResponse,
    isLoading: departmentsLoading,
    refetch: refetchDepartments,
  } = useDepartmentList();

  const departments = departmentsResponse || [];

  // 2. 只有当 ID 存在且 Modal 打开时才请求详情
  const { data: detailResponse, isLoading: isDetailLoading } =
    useDepartmentDetail(
      selectedDeptId,
      !!selectedDeptId && isEditModalOpen // 仅在打开弹窗且有ID时触发
    );

  // 3. 将后端返回的详情数据 转换为 Modal 需要的 initialData 格式
  // 使用 useMemo 避免每次渲染都重新计算
  const formattedEditData = useMemo(() => {
    if (!detailResponse) return undefined;

    return {
      department: {
        id: detailResponse.id,
        name: detailResponse.name,
        code: detailResponse.code,
        category: detailResponse.category,
        parentId: detailResponse.parentId,
        address: detailResponse.address,
        contactPhone: detailResponse.contactPhone,
      },
      site: {
        id: detailResponse.site.id, // 假设 siteId 和 deptId 一致，根据你后端逻辑调整
        name: detailResponse.site.name,
        domain: detailResponse.site.domain,
      },
      admin: detailResponse.manager ? { ...detailResponse.manager } : undefined,
    };
  }, [detailResponse]);

  const handleEdit = (id: string) => {
    setSelectedDeptId(id);
    setIsEditModalOpen(true);
  };

  // ✅ 4. 修改关闭回调，清空 ID 防止下次打开瞬间闪现旧数据
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setTimeout(() => setSelectedDeptId(undefined), 200); // 稍微延迟清空，等待弹窗关闭动画完成
  };

  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateModalSuccess = () => {
    setIsCreateModalOpen(false);
    refetchDepartments();
  };

  const handleEditModalSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedDeptId(undefined);
    refetchDepartments();
  };

  const deleteDepartment = useDeleteDepartment();

  const handleDelete = async (id: string, name: string) => {
    const message = `确定要删除部门 "${name}" 吗？\n\n注意：这将同时删除：\n1. 该部门的所有用户\n2. 关联的站点及其所有数据（分类、配置、广告、轮播图等）\n\n此操作不可恢复！`;
    if (!confirm(message)) {
      return;
    }
    try {
      await deleteDepartment.mutateAsync(id);
    } catch (error) {
      // 错误已在 hook 中处理
    }
  };

  if (!isMounted) {
    return (
      <>
        <div className="flex h-16 shrink-0 items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-slate-500 text-sm">加载中...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator className="mr-2 h-4" orientation="vertical" />
          <nav className="font-medium text-sm">组织架构管理</nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-2xl text-slate-900">部门管理</h1>
              <p className="mt-1 text-slate-500">
                管理您的组织架构，创建部门和站点
              </p>
            </div>
            <HasRole role={["super_admin", "出口商管理员", "工厂管理员"]}>
              <Button onClick={handleCreate}>
                <Plus className="mr-2" size={18} />
                创建部门
              </Button>
            </HasRole>
          </div>

          {departmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-slate-500 text-sm">加载中...</p>
              </div>
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 font-semibold text-slate-900">暂无部门</h3>
              <p className="mb-4 text-center text-slate-500">
                您还没有创建任何部门。点击下方按钮开始创建您的第一个部门。
              </p>
              <HasRole role={["super_admin", "出口商管理员", "工厂管理员"]}>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2" size={18} />
                  创建第一个部门
                </Button>
              </HasRole>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {departments.map(
                (department: {
                  id: string;
                  name: string;
                  code: string;
                  category: string;
                  address?: string;
                  contactPhone?: string;
                }) => (
                  <div
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                    key={department.id}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-green-100 p-2">
                          <Building2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">
                            {department.name || "未命名"}
                          </h3>
                          <p className="font-medium text-slate-500 text-sm">
                            {department.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="rounded-full bg-green-100 px-2 py-1">
                          <span className="font-medium text-green-700 text-xs">
                            {department.category === "group"
                              ? "出口商"
                              : "工厂"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2 text-slate-600 text-sm">
                      {department.address && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{department.address}</span>
                        </div>
                      )}
                      {department.contactPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{department.contactPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-slate-100 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Building2 className="h-5 w-5" />
                          <span>部门</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="mr-1 inline font-medium text-indigo-600 text-sm hover:text-indigo-700"
                            onClick={() => handleEdit(department.id)}
                          >
                            编辑
                          </button>
                          <button
                            className="mr-1 inline font-medium text-red-600 text-sm hover:text-red-700"
                            onClick={() =>
                              handleDelete(
                                department.id,
                                department.name || "未命名"
                              )
                            }
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <CreateDepartmentModal
        onOpenChange={handleCreateModalClose}
        onSuccess={handleCreateModalSuccess}
        open={isCreateModalOpen}
      />
      {isEditModalOpen && (
        <EditDepartmentModal
          initialData={formattedEditData}
          onOpenChange={handleEditModalClose}
          onSuccess={handleEditModalSuccess}
          open={isEditModalOpen}
        />
      )}
    </>
  );
}
