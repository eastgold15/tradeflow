import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/NewsletterForm";
import { rpc } from "@/lib/rpc";

// 获取 Footer 配置数据
async function getFooterConfig(): Promise<FooterContent | null> {
  try {
    const { data, error } = await rpc["site-config"].get({
      query: {
        key: SITE_CONFIG_KEY_ENUM.FOOTER_CONTENT,
      }
    })

    if (error) {
      console.error("Failed to fetch footer config:", error);
      return null;
    }

    return data?.[0]?.jsonValue as FooterContent
  } catch (error) {
    console.error("Error fetching footer config:", error);
    return null;
  }
}

// 获取单个配置
async function getSiteConfigValue(key: string): Promise<string | null> {
  try {
    const { data, error } = await rpc["site-config"].get({
      query: {
        key,
      }
    })
    if (error) return null;
    return data?.[0]?.value || null;
  } catch {
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

export default async function Footer() {
  // 并行获取所有配置数据
  const [footerContent, copyright, phone, email, qrCode] = await Promise.all([
    getFooterConfig(),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_COPYRIGHT),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_PHONE),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_EMAIL),
    getSiteConfigValue(SITE_CONFIG_KEY_ENUM.SITE_ERWEIMA),
  ]);

  const columns = footerContent?.columns || [];

  return (
    <footer className="border-gray-200 border-t bg-white pt-20 pb-10">
      <div className="mx-auto max-w-350 px-6">
        <div className="grid grid-cols-2 text-center md:grid-cols-5 md:text-left">
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
                      <Link className="hover:text-black" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* 渲染社交媒体图标 */}
              {column.socials && column.socials.length > 0 && (
                <div className="flex justify-center space-x-6 text-gray-900 md:justify-start">
                  {column.socials.map((social, socialIndex) => (
                    <Link
                      key={socialIndex}
                      aria-label={social.ariaLabel}
                      className={`icon-[${social.icon}] text-2xl text-gray-700 transition-colors hover:text-gray-900`}
                      href={social.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    />
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
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
            {/* 左侧：版权信息 */}
            <p>
              &copy; {new Date().getFullYear()} {copyright || "Your Company"}
            </p>

            {/* 中间：二维码 */}
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

            {/* 右侧：联系信息 */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
              {/* WhatsApp */}
              {phone && (
                <span className="flex items-center">
                  <svg
                    className="mr-2 h-4 w-4"
                    p-id="5907"
                    version="1.1"
                    viewBox="0 0 1024 1024"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M511.872427 0h0.256C794.45376 0 1024.000427 229.674667 1024.000427 512s-229.589333 512-511.872 512c-104.106667 0-200.704-31.018667-281.6-84.565333L33.707093 1002.325333l63.786667-190.250666A508.245333 508.245333 0 0 1 0.000427 512C0.000427 229.674667 229.58976 0 511.872427 0zM365.39776 281.429333c-9.770667-23.338667-17.194667-24.234667-32-24.832A285.525333 285.525333 0 0 0 316.50176 256c-19.285333 0-39.424 5.632-51.626667 18.048C250.155093 289.109333 213.33376 324.266667 213.33376 396.501333c0 72.149333 52.778667 141.952 59.861333 151.722667 7.424 9.728 102.912 160 251.093334 221.226667 115.925333 47.914667 150.314667 43.477333 176.725333 37.845333 38.528-8.277333 86.826667-36.693333 98.986667-70.954667 12.16-34.346667 12.16-63.616 8.618666-69.845333-3.584-6.186667-13.354667-9.728-28.16-17.152-14.848-7.381333-86.869333-42.88-100.522666-47.616-13.354667-4.992-26.069333-3.242667-36.138667 10.965333-14.250667 19.797333-28.16 39.936-39.466667 52.053334-8.874667 9.472-23.424 10.666667-35.541333 5.632-16.298667-6.826667-61.952-22.784-118.314667-72.789334-43.562667-38.741333-73.216-86.954667-81.792-101.418666-8.618667-14.805333-0.896-23.381333 5.930667-31.36 7.381333-9.173333 14.506667-15.658667 21.930667-24.234667 7.424-8.576 11.52-13.013333 16.298666-23.082667 5.034667-9.770667 1.493333-19.84-2.090666-27.221333-3.541333-7.381333-33.194667-79.573333-45.354667-108.8z"
                      fill="#25D366"
                      p-id="5908"
                    />
                  </svg>
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
