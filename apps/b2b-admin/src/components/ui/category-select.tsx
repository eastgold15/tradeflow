"use client";

import { Flame, Plus, Search, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaCategories } from "@/hooks/api/media";
import { cn } from "@/lib/utils";

// 预设分类（作为兜底选项）
const PRESET_CATEGORIES = [
  "general",
  "product",
  "banner",
  "avatar",
  "document",
  "video",
  "thumbnail",
];

interface CategorySelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  placeholder = "选择或输入分类...",
  allowClear = false,
  disabled = false,
}: CategorySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<string[]>([]);

  // 从数据库获取分类列表
  const { data: categoriesData, isLoading } = useMediaCategories(!disabled);

  // 提取分类名称和计数
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (categoriesData?.categories) {
      categoriesData.categories.forEach((cat) => {
        map.set(cat.name, cat.count);
      });
    }
    // 添加预设分类
    PRESET_CATEGORIES.forEach((cat) => {
      if (!map.has(cat)) {
        map.set(cat, 0);
      }
    });
    return map;
  }, [categoriesData]);

  // 热门分类（按数量排序，显示所有有数量的分类）
  const popularCategories = React.useMemo(() => {
    return Array.from(categoryMap.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [categoryMap]);

  // 所有可用分类
  const allCategories = React.useMemo(() => {
    return Array.from(categoryMap.keys()).sort();
  }, [categoryMap]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const handleInputValueChange = (newValue: string) => {
    setInputValue(newValue);
    if (newValue.trim()) {
      const results = allCategories.filter((cat) =>
        cat.toLowerCase().includes(newValue.toLowerCase().trim())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      const trimmedValue = inputValue.trim();
      handleSelect(trimmedValue);
    }
  };

  const displayCategories = inputValue.trim() ? searchResults : allCategories;

  const hasPopular = popularCategories.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
            size="default"
            type="button"
            variant="outline"
          >
            <span className="truncate">{value || placeholder}</span>
            <div className="flex items-center gap-1">
              {value && allowClear && (
                <button
                  className="flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              )}
              {isLoading ? (
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Search className="size-4 opacity-50" />
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              onKeyDown={handleKeyDown}
              onValueChange={handleInputValueChange}
              placeholder={placeholder}
              value={inputValue}
            />
            <CommandList
              className="max-h-90 overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
            >
              {isLoading ? (
                <CommandEmpty>
                  <div className="flex items-center justify-center py-4">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </CommandEmpty>
              ) : displayCategories.length === 0 ? (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-4">
                    <p className="text-muted-foreground text-sm">
                      没有找到匹配的分类
                    </p>
                    {inputValue.trim() && (
                      <Button
                        className="h-7"
                        onClick={() => handleSelect(inputValue.trim())}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        添加 "{inputValue.trim()}"
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <>
                  {!inputValue.trim() && hasPopular && (
                    <>
                      <CommandGroup heading="热门分类">
                        <div className="max-h-60 overflow-y-auto">
                          {popularCategories.map((cat) => {
                            const isSelected = value === cat.name;
                            return (
                              <CommandItem
                                key={cat.name}
                                onSelect={() => handleSelect(cat.name)}
                              >
                                <div
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : "opacity-50 [&_svg]:invisible"
                                  )}
                                >
                                  <Flame className="h-3 w-3" />
                                </div>
                                <span className="flex-1">{cat.name}</span>
                                <Badge className="text-xs" variant="secondary">
                                  {cat.count}
                                </Badge>
                              </CommandItem>
                            );
                          })}
                        </div>
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}

                  <CommandGroup>
                    {displayCategories.map((categoryName) => {
                      const isSelected = value === categoryName;
                      const isPreset = PRESET_CATEGORIES.includes(
                        categoryName as any
                      );
                      const popularCat = popularCategories.find(
                        (c) => c.name === categoryName
                      );
                      const count = categoryMap.get(categoryName) || 0;

                      return (
                        <CommandItem
                          key={categoryName}
                          onSelect={() => handleSelect(categoryName)}
                          value={categoryName}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            {popularCat ? (
                              <Flame className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </div>
                          <span className="flex-1">{categoryName}</span>
                          {isPreset && count === 0 && (
                            <Badge className="text-xs" variant="outline">
                              预设
                            </Badge>
                          )}
                          {count > 0 && (
                            <Badge className="text-xs" variant="secondary">
                              {count}
                            </Badge>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="flex items-center justify-end text-muted-foreground text-xs">
          <Button
            className="h-6 text-xs"
            onClick={handleClear}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="mr-1 size-3" />
            清除
          </Button>
        </div>
      )}
    </div>
  );
}
