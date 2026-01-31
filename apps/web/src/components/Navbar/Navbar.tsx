
// Navbar.tsx (Server Component)
import { rpc } from "@/lib/rpc";
import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import { NavbarClient } from "../NavbarClient";

async function getSiteName() {
  try {

    const { data } = await rpc.site_config.get({
      query: { key: SITE_CONFIG_KEY_ENUM.SITE_NAME }
    });
    console.log('data:', data)
    return data?.[0]?.value || "Welcome";
  } catch {
    return "Welcome";
  }
}

// 假设你的分类导航也可以通过 RPC 获取
async function getSiteCategories() {
  const { data, error } = await rpc.site_category.get();
  if (error) {
    return [];
  }
  return data || [];
}


const Navbar = async () => {
  // 并行获取服务端数据
  const [siteName, siteCategories] = await Promise.all([
    getSiteName(),
    getSiteCategories(),
  ]);
  // 将数据传给客户端组件处理交互
  return <NavbarClient siteName={siteName} initialCategories={siteCategories} />;

  // return (
  //   <nav
  //     className={`sticky top-0 left-0 z-50 w-full border-gray-200 border-b bg-white transition-all duration-300 ${isScrolled ? "pb-2 shadow-sm" : "pb-4"} sm:h-(--navbar-height-sm) md:h-(--navbar-height)`}
  //     style={{
  //       height: "var(--navbar-height)", // 使用 CSS 变量
  //     }}
  //   >
  //     <div className="max-w-full px-4 md:px-8 lg:px-12">
  //       <div className="flex h-full items-center justify-between md:h-full">
  //         {/* ... Left Section (Menu Toggle / Lang) ... */}
  //         <div className="flex w-1/5 items-center">
  //           <button
  //             className="md:hidden"
  //             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  //           >
  //             {isMobileMenuOpen ? (
  //               <X className="h-6 w-6" />
  //             ) : (
  //               <Menu className="h-6 w-6" />
  //             )}
  //           </button>
  //           {/* 语言切换：纯Link组件，SEO友好 */}
  //           {/* <Link
  //             className="hidden items-center font-bold text-[10px] uppercase tracking-widest transition-colors hover:text-gray-500 md:flex"
  //             href="/language/en"
  //             onClick={navigateWithScroll}
  //           >
  //             EN <span className="ml-1 text-[8px]">▼</span>
  //           </Link> */}
  //         </div>

  //         <div className="w-3/5 justify-center">
  //           <Link
  //             className="grid w-full origin-center place-items-center whitespace-nowrap pt-2 text-center font-serif text-sm md:text-3xl"
  //             href="/"
  //           >
  //             {site_name?.[0]?.value || "Welcome"}
  //           </Link>
  //         </div>

  //         {/* ... Right Icons ... */}
  //         <div className="flex w-1/5 items-center justify-end space-x-4">
  //           <SearchDropdown />

  //           {/* 导航图标：使用配置数据映射 */}
  //           {/* {navItems.map((item) => (
  //             <NavIcon
  //               icon={item.icon}
  //               key={item.href}
  //               onClick={() => handleNavigate(item.href)}
  //               // showOnMobile={item.showOnMobile}
  //               // badgeCount={item.badgeCount}
  //             />
  //           ))} */}
  //         </div>
  //       </div>

  //       {/* 核心重构点 1: Desktop Menu */}
  //       <div className="hidden py-3 md:block">
  //         {/* 直接传入数据，DesktopMenu 内部负责渲染逻辑 */}
  //         <DesktopMenu categories={categories} />
  //       </div>
  //     </div>

  //     {/* 核心重构点 2: Mobile Menu Overlay */}
  //     {isMobileMenuOpen && (
  //       <div className="fixed top-16 left-0 z-40 flex h-[calc(100vh-64px)] w-full flex-col overflow-y-auto bg-white p-8 md:hidden">
  //         {/* 直接复用 MobileMenu 组件 */}
  //         <MobileMenu
  //           categories={categories}
  //           className="text-base"
  //           onClose={() => setIsMobileMenuOpen(false)}
  //         />

  //         {/* 其他静态链接 (Account, Wishlist) 可以作为一个配置数组传入，或直接写在这里 */}
  //         <div className="mt-8 space-y-4 font-bold text-xs uppercase tracking-widest">
  //           <Link className="block py-2" href="/account">
  //             Account
  //           </Link>
  //           <Link className="block py-2" href="/wishlist">
  //             Wishlist
  //           </Link>
  //         </div>
  //       </div>
  //     )}
  //   </nav>
  // );
};

export default Navbar;
