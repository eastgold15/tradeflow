import { NewsletterForm } from "@/components/NewsletterForm";
import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import Image from "next/image";
import Link from "next/link";
import { getSiteConfigValueForSSR, getSiteConfigJsonForSSR } from "@/lib/server-fetch";

// 获取 Footer 配置数据
async function getFooterConfig(): Promise<FooterContent | null> {
  try {
    const result = await getSiteConfigJsonForSSR<FooterContent>(SITE_CONFIG_KEY_ENUM.FOOTER_CONTENT);
    console.log("[Footer] Footer config fetched from DB:", !!result);
    return result;
  } catch (error) {
    console.error("[Footer] Exception fetching footer config:", error);
    return null;
  }
}

// 获取单个配置
async function getSiteConfigValue(key: string): Promise<string | null> {
  try {
    const value = await getSiteConfigValueForSSR(key);
    return value;
  } catch (error) {
    console.error(`[Footer] Exception fetching config value for key: ${key}`, error);
    return null;
  }
}


// 获取 Footer 配置数据
async function getBeianConfig(): Promise<BEIAN_INFO | null> {
  try {
    const result = await getSiteConfigJsonForSSR<BEIAN_INFO>(SITE_CONFIG_KEY_ENUM.BEIAN_INFO);
    return result;
  } catch (error) {
    console.error("[Footer] Exception fetching beian config:", error);
    return null;
  }
}



// Footer 列类型定义
interface FooterLink {
  label: string;
  href: string;
}

interface SocialLink {
  icon: string;
  href: string;
  ariaLabel: string;
}

interface FooterColumn {
  title: string;
  links?: FooterLink[];
  socials?: SocialLink[];
}

interface FooterContent {
  columns: FooterColumn[];
}

interface BEIAN_INFO {
  icp: string;
  police: string;
  link: string;
}

export default async function Footer() {
  // 并行获取所有配置数据
  const [footerContent, copyright, phone, email, qrCode, beianConfig] = await Promise.all([
    getFooterConfig(),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_COPYRIGHT),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_PHONE),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_EMAIL),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_ERWEIMA),
    getBeianConfig(),
  ]);

  const columns = footerContent?.columns || [];

  return (
    <footer className="border-gray-200 border-t bg-white pt-20 pb-10">
      <div className="mx-auto max-w-350 px-6">
        <div className="grid grid-cols-2 space-y-12 text-center md:grid-cols-5 md:text-left">
          {/* 动态渲染栏目 */}
          {columns.map((column, index) => (
            <div key={index}>
              <h5 className="mb-6 font-bold text-xs uppercase tracking-widest">
                {column.title}
              </h5>

              {/* 渲染链接列表 */}
              {column.links && column.links.length > 0 && (
                <ul className="space-y-3 text-gray-500 text-sm">
                  {column.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link
                        className="cursor-pointer hover:text-black"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* 渲染社交媒体图标 */}
              {column.socials && column.socials.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 text-gray-900 md:flex-nowrap md:justify-start md:space-x-6">
                  {column.socials.map((social, socialIndex) => (
                    // <Link
                    //   key={socialIndex}
                    //   aria-label={social.ariaLabel}
                    //   href={social.href}
                    //   className="text-gray-700 transition-colors hover:text-gray-900"
                    //   target="_blank"
                    //   rel="noopener noreferrer"
                    // >
                    //   {/* 直接使用 Icon 组件，传入数据库里的名字，比如 "mdi:github" */}

                    //   11
                    // </Link>

                    <Link
                      key={socialIndex}
                      href={social.href}
                      className="group flex cursor-pointer items-center justify-center"
                    >
                      <span
                        className="block w-6 h-6 bg-gray-700 transition-colors group-hover:bg-black"
                        style={{
                          // 直接引用 Iconify 的公开 API 地址作为遮罩
                          maskImage: `url('https://api.iconify.design/${social.icon.replace('--', '/')}.svg')`,
                          WebkitMaskImage: `url('https://api.iconify.design/${social.icon.replace('--', '/')}.svg')`,
                          maskRepeat: 'no-repeat',
                          maskSize: '100% 100%'
                        }}
                      />
                    </Link>
                  ))}
                </div>
              )}



            </div>
          ))}

          {/* Newsletter 订阅表单 */}
          <div className="mx-auto mb-20 max-w-xl text-center">
            <NewsletterForm />
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="mt-20 border-gray-100 border-t pt-8 text-center text-gray-400 text-xs tracking-wider">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            {/* 左侧：版权信息 */}
            <div className="flex flex-col items-center gap-1">
              <div>
                &copy; {new Date().getFullYear()} {copyright || "Your Company"}
              </div>
            </div>

            {/* 中间：二维码 + 备案信息 */}
            <div className="flex flex-col items-center gap-4">
              {/* 二维码 */}
              {qrCode && (
                <div className="relative inline-block">
                  <Image
                    alt="WhatsApp QR Code"
                    className="h-24 w-24 cursor-pointer rounded transition-all duration-300 ease-out hover:z-50 hover:scale-150 hover:shadow-2xl"
                    height={256}
                    src={qrCode}
                    width={256}
                  />
                </div>
              )}

              {/* 备案信息 - 放在二维码下面 */}
              {beianConfig && (
                <div className="flex flex-col items-center gap-1 text-gray-500">
                  {beianConfig.icp && <span className="text-[10px]">ICP备案号: {beianConfig.icp}</span>}
                  {beianConfig.police && <span className="text-[10px]">公安备案号: {beianConfig.police}</span>}
                  {beianConfig.link && (
                    <a
                      href={beianConfig.link}
                      target="_blank"
                      rel="nofollow"
                      className="text-blue-400 hover:text-blue-500 transition-colors text-[10px]"
                    >
                      备案信息
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：联系信息 */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
              {/* WhatsApp */}
              {phone && (
                <span className="flex items-center">
                  <div className="icon-[ic--baseline-whatsapp] text-green-500 text-2xl mr-2" />
                  WhatsApp +86 {phone}
                </span>
              )}

              {/* 邮箱 */}
              {email && <span>{email}</span>}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
