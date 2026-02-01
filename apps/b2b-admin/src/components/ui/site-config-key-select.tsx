"use client";

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
import { useSiteConfigKeys } from "@/hooks/api/site-config";
import { cn } from "@/lib/utils";
import {
  SITE_CONFIG_KEY_OPTIONS
} from "@repo/contract";
import { Flame, Plus, Search, X } from "lucide-react";
import * as React from "react";

interface SiteConfigKeySelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function SiteConfigKeySelect({
  value,
  onChange,
  placeholder = "选择或输入配置键...",
  allowClear = false,
  disabled = false,
}: SiteConfigKeySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<string[]>([]);

  // 从数据库获取配置键列表
  const { data: keysData, isLoading } = useSiteConfigKeys(!disabled);

  // 提取配置键和计数
  const keyMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (keysData?.keys) {
      keysData.keys.forEach((key) => {
        map.set(key.key, key.count);
      });
    }
    // 添加预设配置键
    SITE_CONFIG_KEY_OPTIONS.forEach((opt) => {
      if (!map.has(opt.value)) {
        map.set(opt.value, 0);
      }
    });
    return map;
  }, [keysData]);

  // 获取配置键的标签
  const getKeyLabel = (key: string): string => {
    const option = SITE_CONFIG_KEY_OPTIONS.find((opt) => opt.value === key);
    return option?.label || key;
  };

  // 热门配置键（按数量排序，显示所有有数量的键）
  const popularKeys = React.useMemo(() => {
    return Array.from(keyMap.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));
  }, [keyMap]);

  // 所有可用配置键
  const allKeys = React.useMemo(() => {
    return Array.from(keyMap.keys()).sort();
  }, [keyMap]);

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
      const results = allKeys.filter((key) =>
        key.toLowerCase().includes(newValue.toLowerCase().trim()) ||
        getKeyLabel(key).toLowerCase().includes(newValue.toLowerCase().trim())
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

  const displayKeys = inputValue.trim() ? searchResults : allKeys;

  const hasPopular = popularKeys.length > 0;

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
            <span className="truncate">{value ? getKeyLabel(value) : placeholder}</span>
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
              ) : displayKeys.length === 0 ? (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-4">
                    <p className="text-muted-foreground text-sm">
                      没有找到匹配的配置键
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
                      <CommandGroup heading="常用配置">
                        <div className="max-h-60 overflow-y-auto">
                          {popularKeys.map((keyItem) => {
                            const isSelected = value === keyItem.key;
                            return (
                              <CommandItem
                                key={keyItem.key}
                                onSelect={() => handleSelect(keyItem.key)}
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
                                <span className="flex-1">{getKeyLabel(keyItem.key)}</span>
                                <span className="text-muted-foreground text-xs">
                                  {keyItem.key}
                                </span>
                                <Badge className="text-xs ml-2" variant="secondary">
                                  {keyItem.count}
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
                    {displayKeys.map((keyName) => {
                      const isSelected = value === keyName;
                      const isPreset = SITE_CONFIG_KEY_OPTIONS.some(
                        (opt) => opt.value === keyName
                      );
                      const popularKey = popularKeys.find(
                        (k) => k.key === keyName
                      );
                      const count = keyMap.get(keyName) || 0;

                      return (
                        <CommandItem
                          key={keyName}
                          onSelect={() => handleSelect(keyName)}
                          value={keyName}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                          >
                            {popularKey ? (
                              <Flame className="h-3 w-3" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </div>
                          <span className="flex-1">{getKeyLabel(keyName)}</span>
                          <span className="text-muted-foreground text-xs">
                            {keyName}
                          </span>
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
          <span className="text-muted-foreground">{value}</span>
          <Button
            className="h-6 ml-2 text-xs"
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
