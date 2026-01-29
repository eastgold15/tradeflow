"use client";
import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteConfigList } from "@/hooks/api/site-config";
import { useCategoryNavigation } from "@/hooks/useCategoryNavigation";
import { DesktopMenu } from "./DesktopMenu";
import { useNavAction } from "./hook/useNavAction";
import { MobileMenu } from "./MobileMenu";
import { SearchDropdown } from "./SearchDropdown";

// 引入你原来的 useNavigation 或直接写在这里
// 引入 NavIcon 组件（可以保持你原来的不变，或者也移到 NavParts）
// 统一样式管理
const styles = {
  navIcon: "text-black transition-colors hover:text-gray-500",
  icon: "h-4 w-4 md:h-5 md:w-5",
  uppercase: "uppercase tracking-wider",
  mobileLink: "block py-2 text-sm uppercase tracking-wider hover:text-gray-500",
  badge:
    "-top-1 -right-1 absolute flex h-3 w-3 items-center justify-center rounded-full bg-black text-[9px] text-white",
} as const;

// 导航项配置
const navItems = [
  { href: "/wishlist", icon: Heart, showOnMobile: false },
  { href: "/account", icon: User, showOnMobile: false },
  { href: "/cart", icon: ShoppingBag, badgeCount: 0 },
] as const;

// NavIcon 组件
interface NavIconProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick?: () => void;
  className?: string;
  showOnMobile?: boolean;
  badgeCount?: number;
}

const NavIcon: React.FC<NavIconProps> = ({
  icon: Icon,
  onClick,
  className = "",
  showOnMobile = true,
  badgeCount,
  ...props
}) => (
  <div
    className={`${showOnMobile ? "" : "hidden md:block"} relative ${styles.navIcon} ${className}`}
    {...props}
  >
    <Icon className={styles.icon} strokeWidth={1.5} />
    {badgeCount !== undefined && (
      <span className={styles.badge}>{badgeCount}</span>
    )}
  </div>
);

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: site_name } = useSiteConfigList({
    query: {
      key: SITE_CONFIG_KEY_ENUM.SITE_NAME,
    },
  });

  // 获取分类数据 (这里假设 hook 返回 { categories, loading })
  const { categories } = useCategoryNavigation();
  const { handleNavigate } = useNavAction();
  // 滚动监听逻辑保持不变...
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 left-0 z-50 w-full border-gray-200 border-b bg-white transition-all duration-300 ${isScrolled ? "pb-2 shadow-sm" : "pb-4"} sm:h-(--navbar-height-sm) md:h-(--navbar-height)`}
      style={{
        height: "var(--navbar-height)", // 使用 CSS 变量
      }}
    >
      <div className="max-w-full px-4 md:px-8 lg:px-12">
        <div className="flex h-full items-center justify-between md:h-full">
          {/* ... Left Section (Menu Toggle / Lang) ... */}
          <div className="flex w-1/5 items-center">
            <button
              className="mr-4 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            {/* 语言切换：纯Link组件，SEO友好 */}
            {/* <Link
              className="hidden items-center font-bold text-[10px] uppercase tracking-widest transition-colors hover:text-gray-500 md:flex"
              href="/language/en"
              onClick={navigateWithScroll}
            >
              EN <span className="ml-1 text-[8px]">▼</span>
            </Link> */}
          </div>

          <div className="flex w-3/5 justify-center overflow-hidden">
            <Link
              className="flex w-full items-center justify-center pt-2 font-serif tracking-widest"
              href="/"
            >
              <span
                className="whitespace-nowrap text-4xl md:text-5xl"
                key={site_name?.[0]?.value}
                style={{
                  fontSize: "clamp(1rem, 10vw, 3rem)", // 根据屏幕宽度自动缩放字号
                }}
              >
                {site_name?.[0]?.value || "Welcome"}
              </span>
            </Link>
          </div>

          {/* ... Right Icons ... */}
          <div className="flex w-1/5 items-center justify-end space-x-4">
            <SearchDropdown />

            {/* 导航图标：使用配置数据映射 */}
            {/* {navItems.map((item) => (
              <NavIcon
                icon={item.icon}
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                // showOnMobile={item.showOnMobile}
                // badgeCount={item.badgeCount}
              />
            ))} */}
          </div>
        </div>

        {/* 核心重构点 1: Desktop Menu */}
        <div className="hidden py-3 md:block">
          {/* 直接传入数据，DesktopMenu 内部负责渲染逻辑 */}
          <DesktopMenu categories={categories} />
        </div>
      </div>

      {/* 核心重构点 2: Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed top-16 left-0 z-40 flex h-[calc(100vh-64px)] w-full flex-col overflow-y-auto bg-white p-8 md:hidden">
          {/* 直接复用 MobileMenu 组件 */}
          <MobileMenu
            categories={categories}
            onClose={() => setIsMobileMenuOpen(false)}
          />

          {/* 其他静态链接 (Account, Wishlist) 可以作为一个配置数组传入，或直接写在这里 */}
          <div className="mt-8 space-y-4 font-bold text-xs uppercase tracking-widest">
            <Link className="block py-2" href="/account">
              Account
            </Link>
            <Link className="block py-2" href="/wishlist">
              Wishlist
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
