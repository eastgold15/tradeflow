"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiTagInputProps {
  label?: string;
  placeholder?: string;
  options: string[]; // 预定义的选项
  value: string[]; // 当前选中的值
  onChange: (values: string[]) => void; // 值变化回调
  allowCustom?: boolean; // 是否允许自定义输入(不在 options 中的值)
}

export function MultiTagInput({
  label,
  placeholder = "选择或输入...",
  options,
  value,
  onChange,
  allowCustom = true,
}: MultiTagInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 处理选择预设选项
  const handleSelectOption = (option: string) => {
    if (!value.includes(option)) {
      onChange([...value, option]);
    }
    setInputValue("");
  };

  // 处理移除标签
  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  // 处理自定义输入(回车添加)
  const handleAddCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  // 清空所有
  const handleClearAll = () => {
    onChange([]);
  };

  // 全选/取消全选
  const handleToggleSelectAll = () => {
    const allSelected = options.every((option) => value.includes(option));
    if (allSelected) {
      // 取消全选：只移除预设选项，保留自定义值
      onChange(value.filter((v) => !options.includes(v)));
    } else {
      // 全选：合并当前值和所有预设选项，去重
      const newValue = [...new Set([...value, ...options])];
      onChange(newValue);
    }
  };

  // 判断是否全选
  const isAllSelected = options.length > 0 && options.every((option) => value.includes(option));
  // 判断是否部分选中
  const isPartiallySelected = options.some((option) => value.includes(option)) && !isAllSelected;

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="text-sm">{label}</Label>}

      {/* --- 已选标签显示区：修复重点 --- */}
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-md border bg-background p-2",
          // 1. 确保 max-height 是有效的数值（如 120px 或 max-h-32）
          // 2. 确保设置了 overflow-y-auto
          "min-h-10 max-h-30 overflow-y-auto",
        )}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground text-sm flex items-center">
            {placeholder}
          </span>
        ) : (
          value.map((tag) => (
            <Badge className="gap-1 pr-1 shrink-0" key={tag} variant="secondary">
              {tag}
              <button
                className="rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                onClick={() => handleRemoveTag(tag)}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* 选择器 */}
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-between"
            size="sm"
            type="button"
            variant="outline"
          >
            {open ? "收起列表" : "点击选择/添加选项"}
            <ChevronDown
              className={cn(
                "h-4 w-4 opacity-50 transition-transform",
                open && "rotate-180"
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command className="max-h-[350px]">
            <CommandInput
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCustom();
              }}
              onValueChange={setInputValue}
              placeholder="搜索或输入后回车..."
              value={inputValue}
            />
            <CommandList className="max-h-[400px] overflow-y-auto">
              {/* 全选选项 */}
              {options.length > 0 && (
                <CommandGroup heading="批量操作">
                  <CommandItem onSelect={handleToggleSelectAll}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isAllSelected
                          ? "bg-primary text-primary-foreground"
                          : isPartiallySelected
                            ? "bg-primary/50 text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="flex-1">
                      {isAllSelected ? "取消全选" : "全选"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {value.filter((v) => options.includes(v)).length}/{options.length}
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandEmpty>
                {allowCustom ? (
                  <div className="flex flex-col gap-2 py-2">
                    <p className="px-2 text-muted-foreground text-sm">
                      按回车添加: "{inputValue}"
                    </p>
                    <Button
                      className="h-7"
                      onClick={handleAddCustom}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      + 添加 "{inputValue}"
                    </Button>
                  </div>
                ) : (
                  <p className="px-2 py-4 text-muted-foreground text-sm">
                    没有找到选项
                  </p>
                )}
              </CommandEmpty>

              {/* 预设选项列表 */}
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option);
                  return (
                    <CommandItem
                      key={option}
                      onSelect={() => handleSelectOption(option)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="flex-1">{option}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 操作按钮 */}
      {value.length > 0 && (
        <Button
          className="h-7"
          onClick={handleClearAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          清空全部
        </Button>
      )}
    </div>
  );
}
