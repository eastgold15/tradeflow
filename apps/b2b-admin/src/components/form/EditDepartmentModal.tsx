"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Server, User } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateDepartmentWithSiteAndAdmin } from "@/hooks/api/department";
import { useAuthStore } from "@/stores/auth-store";

// 表单验证架构
const formSchema = z.object({
  id: z.string().optional(),
  departmentName: z.string().min(2, "部门名称至少需要2个字符"),
  departmentCode: z.string().min(2, "部门编码至少需要2个字符"),
  category: z.enum(["group", "factory"]),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  siteName: z.string().min(2, "站点名称至少需要2个字符"),
  domain: z.string().min(2, "站点域名至少需要2个字符"),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPassword: z.string().optional(),
  adminPhone: z.string().optional(),
  adminPosition: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface EditDeptData {
  department: {
    id: string;
    name?: string;
    code?: string;
    category?: string;
    parentId?: string | null;
    address?: string;
    contactPhone?: string;
  };
  site: {
    id: string;
    name?: string;
    domain?: string;
  };
  admin?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
  };
}

interface EditDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: EditDeptData;
  isLoading?: boolean; // 父组件传入的详情接口加载状态
}

export function EditDepartmentModal({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  isLoading,
}: EditDepartmentModalProps) {
  const updateDepartment = useUpdateDepartmentWithSiteAndAdmin();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.isSuperAdmin;
  const isGroup = user?.context.department.category === "group";
  const isReadOnly = !(isSuperAdmin || isGroup);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departmentName: "",
      departmentCode: "",
      category: "factory",
      address: "",
      contactPhone: "",
      siteName: "",
      domain: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      adminPhone: "",
      adminPosition: "部门管理员",
    },
  });

  // 核心修复：当 Modal 打开且拿到新数据时重置表单
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        id: initialData.department.id,
        departmentName: initialData.department.name || "",
        departmentCode: initialData.department.code || "",
        category:
          (initialData.department.category as "group" | "factory") || "factory",
        address: initialData.department.address || "",
        contactPhone: initialData.department.contactPhone || "",
        siteName: initialData.site.name || "",
        domain: initialData.site.domain || "",
        adminName: initialData.admin?.name || "",
        adminEmail: initialData.admin?.email || "",
        adminPassword: "", // 始终清空密码框
        adminPhone: initialData.admin?.phone || "",
        adminPosition: initialData.admin?.position || "部门管理员",
      });
    }
  }, [initialData, open, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (!data.id) {
        form.setError("id", { message: "部门ID缺失，无法更新" });
        return;
      }

      const payload = {
        department: {
          id: data.id,
          name: data.departmentName,
          code: data.departmentCode,
          category: data.category,
          parentId: initialData?.department.parentId,
          address: data.address,
          contactPhone: data.contactPhone,
        },
        site: {
          name: data.siteName,
          domain: data.domain,
          isActive: true,
        },
        admin:
          data.adminName && data.adminEmail
            ? {
              id: initialData?.admin?.id,
              name: data.adminName,
              email: data.adminEmail,
              ...(data.adminPassword && { password: data.adminPassword }),
              phone: data.adminPhone,
              position: data.adminPosition,
            }
            : undefined,
      };

      await updateDepartment.mutateAsync(payload as any);
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("更新失败:", error);
      const errorMessage = error?.message || String(error);

      // 业务错误反馈
      if (
        errorMessage.includes("邮箱") &&
        errorMessage.includes("已被其他部门使用")
      ) {
        form.setError("adminEmail", { message: errorMessage });
      } else {
        const genericMessage = error?.response?.data?.message || errorMessage;
        form.setError("adminEmail", { message: genericMessage });
      }
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(); // 关闭时重置，防止下次打开闪现
    }
    onOpenChange(isOpen);
  };

  const isUpdating = updateDepartment.isPending;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" />
            编辑部门
          </DialogTitle>
          <DialogDescription>
            编辑部门信息、站点设置和管理员信息
          </DialogDescription>
        </DialogHeader>

        {/* 核心修复：加载详情数据时显示 Loader，避免显示旧表单数据 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 text-sm">正在加载最新详情数据...</p>
          </div>
        ) : (
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              {/* 部门信息部分 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">部门信息</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="departmentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>部门名称 *</FormLabel>
                        <FormControl>
                          <Input placeholder="部门名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="departmentCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>部门编码 *</FormLabel>
                        <FormControl>
                          <Input placeholder="部门编码" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部门类型 *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="group">集团</SelectItem>
                          <SelectItem value="factory">工厂</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>详细地址</FormLabel>
                      <FormControl>
                        <Input placeholder="地址" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input placeholder="联系电话" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 站点信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Server className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">站点信息</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>站点名称 *</FormLabel>
                        <FormControl>
                          <Input placeholder="站点名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>站点域名 *</FormLabel>
                        <FormControl>
                          <Input placeholder="域名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 管理员信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">
                    管理员信息{" "}
                    <span className="font-normal text-slate-500">(可选)</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="adminName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓名</FormLabel>
                        <FormControl>
                          <Input
                            className={
                              isReadOnly ? "cursor-not-allowed bg-slate-50" : ""
                            }
                            readOnly={isReadOnly}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>邮箱</FormLabel>
                        <FormControl>
                          <Input
                            className={
                              isReadOnly ? "cursor-not-allowed bg-slate-50" : ""
                            }
                            readOnly={isReadOnly}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        登录密码{" "}
                        <span className="font-normal text-slate-400">
                          (留空不修改)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={
                            isReadOnly ? "cursor-not-allowed bg-slate-50" : ""
                          }
                          readOnly={isReadOnly}
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  disabled={isUpdating}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  取消
                </Button>
                <Button disabled={isUpdating} type="submit">
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      保存修改
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
