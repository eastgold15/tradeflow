"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

export const inquirySchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    company: z.string().min(1, "Company name is required"),
    phone: z.string(),
    email: z.email().optional().or(z.literal("")),
    whatsapp: z.string().optional(),
    remarks: z.string().optional(),
  })
  .refine((data) => data.phone || data.email || data.whatsapp, {
    message: "Please provide at least one contact method",
    path: ['phone'], // 错误信息显示在 email 下方，或者你可以显示在顶层
  });

export type InquiryFormValues = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
  onSubmit: (values: InquiryFormValues) => Promise<void>;
  defaultValues?: Partial<InquiryFormValues>;
}

export function InquiryForm({ onSubmit, defaultValues }: InquiryFormProps) {
  // 1. 初始化表单
  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      whatsapp: "",
      remarks: "",
      ...defaultValues, // 自动填充用户上次填过的信息
    },
  });

  // 获取提交状态
  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>

        {/* Company Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              {/* 不再需要手动写红色 * 号，FormMessage 会自动处理错误展示 */}
              <FormControl>
                <Input
                  placeholder="Name *"
                  {...field}
                  className="border-gray-200 transition-all focus:border-black"
                />
              </FormControl>
              <FormMessage className="text-[10px] text-red-500" />
            </FormItem>
          )}
        />
        {/* Company Field */}
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              {/* 不再需要手动写红色 * 号，FormMessage 会自动处理错误展示 */}
              <FormControl>
                <Input
                  placeholder="Company Name *"
                  {...field}
                  className="border-gray-200 transition-all focus:border-black"
                />
              </FormControl>
              <FormMessage className="text-[10px] text-red-500" />
            </FormItem>
          )}
        />

        {/* Contact Group */}
        <div className="space-y-4 border-gray-100 border-t pt-4">
          <p className="font-bold text-[10px] text-gray-400  tracking-wider">
            Contact (Provide at least one)
          </p>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Phone" type="tel" {...field} />
                </FormControl>
                <FormMessage className="text-[10px] text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Email" type="email" {...field} />
                </FormControl>
                <FormMessage className="text-[10px] text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="WhatsApp " type="tel" {...field} />
                </FormControl>
                <FormMessage className="text-[10px] text-red-500" />
              </FormItem>
            )}
          />

        </div>

        {/* Remarks */}
        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  className="h-24 resize-none"
                  placeholder="Additional notes..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <Button
          className="h-12 w-full bg-black font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-800"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              Submit Request <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
