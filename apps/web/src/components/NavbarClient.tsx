"use client";

import { X, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { DesktopMenu } from "./Navbar/DesktopMenu";
import { MobileMenu } from "./Navbar/MobileMenu";
import { SearchDropdown } from "./Navbar/SearchDropdown";
import { SiteCategoryListRes } from "@/hooks/api/site-category";
import Link from "next/link";
import { UnifiedMenu } from "./Navbar/UnifiedMenu";
import { twMerge } from "tailwind-merge";

interface NavbarClientProps {
  siteName: string;
  initialCategories: SiteCategoryListRes;
}

export const NavbarClient = ({ siteName, initialCategories }: NavbarClientProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  // 1. 创建 Ref 来绑定 nav 元素
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);

    // 2. 测量实际高度的函数
    const updateHeight = () => {
      if (navRef.current) {
        setNavHeight(navRef.current.offsetHeight);
      }
    };

    window.addEventListener("scroll", handleScroll);
    updateHeight(); // 初始测量
    window.addEventListener("resize", updateHeight); // 窗口缩放时重测


    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeight);
    };
  }, [isScrolled]);


  return (
    <nav
      ref={navRef}
      className={`sticky top-0 left-0 z-50 w-full border-b border-gray-200 bg-white transition-all duration-300 ${isScrolled ? "py-2 shadow-sm" : "py-4"
        }`}
    >
      <div className="max-w-full px-4 md:px-8 lg:px-12">
        <div className="flex items-center justify-between">

          {/* 1. 左侧按钮区域 */}
          <div className="flex w-1/5 items-center">
            <button
              className="relative z-51 md:hidden" // z-index 高于移动端抽屉
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* 2. 中间 Logo 区域 */}
          <div className="flex w-3/5 justify-center">
            <Link
              className="whitespace-nowrap font-serif text-sm transition-all md:text-3xl"
              href="/"
            >
              {siteName || "Welcome"}
            </Link>
          </div>

          {/* 3. 右侧 功能区域 */}
          <div className="flex w-1/5 items-center justify-end space-x-4">
            <SearchDropdown />
          </div>
        </div>

        {/* 桌面端直接调用 */}
        <div className="hidden md:block">
          <UnifiedMenu categories={initialCategories} variant="desktop" />
        </div>
      </div>

      {/* 4. 动态设置 top */}
      <div
        className={twMerge(
          "fixed inset-x-0 bottom-0 z-40  bg-white transition-transform md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          top: `${navHeight}px`, // 动态 top 值
          height: `calc(100vh - ${navHeight}px)` // 确保高度刚好填满剩余屏幕
        }}
      >
        <div className="h-full overflow-y-auto p-6">
          <UnifiedMenu
            categories={initialCategories}
            variant="mobile"
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </div>



    </nav>
  );
};