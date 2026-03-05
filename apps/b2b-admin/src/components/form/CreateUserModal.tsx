"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMasterCategoryList } from "@/hooks/api";
import { useDepartmentList } from "@/hooks/api/department";
import { useRoleList } from "@/hooks/api/role";
import { useCreateUser, useUpdateUser } from "@/hooks/api/user";
import { useAuthStore } from "@/stores/auth-store";

const formSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  position: z.string().optional(),
  roleId: z.string().min(1, "请选择角色"),
  deptId: z.string().min(1, "请选择部门"),
  isActive: z.boolean().default(true),
  masterCategoryIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  userId?: string;
  initialData?: Partial<FormData>;
}

export function CreateUserModal({
  open,
  onOpenChange,
  onSuccess,
  userId,
  initialData,
}: UserModalProps) {
  const isEdit = !!userId;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useRoleList();
  const {
    data: departmentsData,
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useDepartmentList({});
  const { data: masterCategoriesData, isLoading: categoriesLoading } =
    useMasterCategoryList();

  const roles = rolesData || [];
  const departments = departmentsData || [];
  const masterCategories = masterCategoriesData || [];

  // 获取当前登录用户的角色名称
  const currentUserRoleName = useAuthStore(
    (state) => state.user?.roles[0]?.name
  );

  // 创建过滤后的角色列表
  const filteredRoles = roles.filter((role: any) => {
    // 始终过滤超级管理员和当前用户角色
    if (role.name === "super_admin" || role.name === "超级管理员") return false;

    // 编辑模式：如果用户当前拥有该角色，保留显示
    if (isEdit && initialData?.roleId) {
      const userCurrentRoleName = roles.find(
        (r) => r.id === initialData.roleId
      )?.name;
      if (role.name === userCurrentRoleName) return true;
    }

    // 过滤当前登录用户的角色
    if (role.name === currentUserRoleName) return false;

    return true;
  });

  // 判断当前角色是否被禁用
  const isCurrentRoleDisabled =
    isEdit &&
    initialData?.roleId &&
    (() => {
      const userCurrentRoleName = roles.find(
        (r) => r.id === initialData.roleId
      )?.name;
      return (
        userCurrentRoleName === currentUserRoleName ||
        userCurrentRoleName === "超级管理员" ||
        userCurrentRoleName === "super_admin"
      );
    })();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      whatsapp: "",
      position: "",
      roleId: "",
      deptId: "",
      isActive: true,
      masterCategoryIds: [],
    },
  });

  useEffect(() => {
    if (isEdit && initialData) {
      const currentMasterCategoryIds = initialData.masterCategoryIds || [];
      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        password: "",
        phone: initialData.phone || "",
        whatsapp: initialData.whatsapp || "",
        position: initialData.position || "",
        roleId: initialData.roleId || "",
        deptId: initialData.deptId || "",
        isActive: initialData.isActive ?? true,
        masterCategoryIds: currentMasterCategoryIds,
      });
    } else if (!isEdit) {
      form.reset({
        name: "",
        email: "",
        password: "",
        phone: "",
        whatsapp: "",
        position: "",
        roleId: "",
        deptId: "",
        isActive: true,
        masterCategoryIds: [],
      });
    }
  }, [isEdit, initialData, form]);

  const selectedRole = form.watch("roleId");

  const isSalesperson = ["工厂业务员", "出口商业务员"].includes(
    roles.find((r) => r.id === selectedRole)?.name || ""
  );
  console.log(
    " roles.find((r) => r.id === selectedRole)?.name:",
    roles.find((r) => r.id === selectedRole)?.name
  );
  console.log("isSalesperson:", isSalesperson);

  const onSubmit = async (data: FormData) => {
    try {
      const submitData = {
        ...data,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        position: data.position || null,
      };

      if (isEdit) {
        await updateUser.mutateAsync({
          id: userId!,
          data: submitData,
        });
      } else {
        if (!data.password) {
          throw new Error("创建用户时密码不能为空");
        }
        await createUser.mutateAsync({
          ...submitData,
          password: data.password,
        });
      }
      onSuccess?.();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("操作失败:", error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑用户" : "创建用户"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "编辑用户信息。如果是业务员角色，可以调整负责的主分类。"
              : "创建新用户并分配角色和部门。如果是业务员角色，可以分配负责的主分类。"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="border-slate-200 border-b pb-2">
                <h3 className="font-semibold text-slate-900">账号信息</h3>
                <p className="text-slate-500 text-sm">
                  设置用户的登录账号和密码
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱 *</FormLabel>
                      <FormControl>
                        <Input placeholder="example@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      密码{" "}
                      {isEdit && (
                        <span className="font-normal text-slate-500">
                          (留空不修改密码不能更新，忘记就删除用户)
                        </span>
                      )}
                      {!isEdit && "*"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          isEdit
                            ? "留空则不修改密码"
                            : "请输入密码（至少6个字符）"
                        }
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="border-slate-200 border-b pb-2">
                <h3 className="font-semibold text-slate-900">联系方式</h3>
                <p className="text-slate-500 text-sm">
                  设置用户的联系方式（可选）
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>手机号码</FormLabel>
                      <FormControl>
                        <Input placeholder="+86 138 0000 0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+86 138 0000 0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>职位</FormLabel>
                    <FormControl>
                      <Input placeholder="销售经理" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="border-slate-200 border-b pb-2">
                <h3 className="font-semibold text-slate-900">角色和部门</h3>
                <p className="text-slate-500 text-sm">
                  分配用户的角色和所属部门
                </p>
              </div>

              {rolesError || departmentsError ? (
                <div className="rounded-md bg-red-50 p-3 text-red-700 text-sm">
                  <p>加载数据失败：</p>
                  {rolesError && <p>角色: {rolesError.message}</p>}
                  {departmentsError && <p>部门: {departmentsError.message}</p>}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色 *</FormLabel>
                      <Select
                        disabled={!!isCurrentRoleDisabled}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择角色" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredRoles.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isCurrentRoleDisabled && (
                        <p className="mt-1 text-slate-500 text-xs">
                          当前角色不能修改
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deptId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部门 *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择部门" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>账号状态</FormLabel>
                      <p className="text-slate-500 text-xs">
                        启用后用户可以登录系统
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {isSalesperson && (
              <div className="space-y-4">
                <div className="border-slate-200 border-b pb-2">
                  <h3 className="font-semibold text-slate-900">主分类分配</h3>
                  <p className="text-slate-500 text-sm">
                    选择该业务员负责的主分类（可多选）
                  </p>
                </div>

                <div>
                  <div className="mb-2 block">
                    <Label>负责的主分类</Label>
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                    {masterCategories.length === 0 ? (
                      <p className="text-slate-500 text-sm">暂无主分类</p>
                    ) : (
                      masterCategories.map((category) => {
                        const isSelected = form
                          .watch("masterCategoryIds")
                          ?.includes(category.id);
                        return (
                          <div
                            className="flex items-center space-x-2"
                            key={category.id}
                          >
                            <Switch
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const current =
                                  form.watch("masterCategoryIds") || [];
                                if (checked) {
                                  form.setValue("masterCategoryIds", [
                                    ...current,
                                    category.id,
                                  ]);
                                } else {
                                  form.setValue(
                                    "masterCategoryIds",
                                    current.filter(
                                      (id: string) => id !== category.id
                                    )
                                  );
                                }
                              }}
                            />
                            <label className="text-slate-700 text-sm">
                              {category.name}
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                取消
              </Button>
              <Button disabled={isLoading} type="submit">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEdit ? "更新中..." : "创建中..."}
                  </>
                ) : isEdit ? (
                  "保存修改"
                ) : (
                  "创建用户"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
