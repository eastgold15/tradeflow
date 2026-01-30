"use client";

import { SITE_CONFIG_KEY_ENUM } from "@repo/contract";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { useSubscribeNewsletter } from "@/hooks/api/newsletter-hook";
import { useSiteConfigList } from "@/hooks/api/site-config";

const Footer: React.FC = () => {
  const { data: site_phone } = useSiteConfigList({
    query: {
      key: SITE_CONFIG_KEY_ENUM.SITE_PHONE,
    },
  });
  const { data: site_copyright } = useSiteConfigList({
    query: {
      key: SITE_CONFIG_KEY_ENUM.SITE_COPYRIGHT,
    },
  });
  const { data: site_email } = useSiteConfigList({
    query: {
      key: SITE_CONFIG_KEY_ENUM.SITE_EMAIL,
    },
  });
  const { data: site_erweima } = useSiteConfigList({
    query: {
      key: SITE_CONFIG_KEY_ENUM.SITE_ERWEIMA,
    },
  });

  // Newsletter 订阅状态
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const subscribeMutation = useSubscribeNewsletter();

  // 重置成功消息的定时器
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000); // 5秒后隐藏成功消息
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证邮箱
    if (!email.trim()) {
      setEmailError("请输入邮箱地址");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("请输入有效的邮箱地址");
      return;
    }

    setEmailError("");

    // 调用订阅 API
    subscribeMutation.mutate(email, {
      onSuccess: () => {
        setEmail(""); // 清空输入框
        setShowSuccessMessage(true); // 显示成功消息
      },
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(""); // 用户开始输入时清除错误提示
    }
    if (showSuccessMessage) {
      setShowSuccessMessage(false); // 用户开始输入时隐藏成功消息
    }
  };

  return (
    <footer className="border-gray-200 border-t bg-white pt-20 pb-10">
      <div className="mx-auto max-w-350 px-6">
        <div className="grid grid-cols-2 text-center md:grid-cols-5 md:text-left">
          <div>
            <h5 className="mb-6 font-bold text-xs uppercase tracking-widest">
              Customer Care
            </h5>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>
                <Link className="hover:text-black" href="/single/contact">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link className="hover:text-black" href="/single/ship">
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link className="hover:text-black" href="/single/size">
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="mb-6 font-bold text-xs uppercase tracking-widest">
              The Brand
            </h5>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>
                <Link className="hover:text-black" href="/single/about">
                  About DONGQIFOOTWEAR
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="mb-6 font-bold text-xs uppercase tracking-widest">
              Legal
            </h5>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li>
                <Link className="hover:text-black" href="/single/privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="hover:text-black" href="/single/terms">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="mb-6 font-bold text-xs uppercase tracking-widest">
              Follow Us
            </h5>
            <div className="flex justify-center space-x-6 text-gray-900 md:justify-start">
              <Link
                aria-label="Instagram"
                className="icon-[mdi--instagram] text-2xl text-gray-700 transition-colors hover:text-pink-600"
                href="https://www.instagram.com/yourusername"
                rel="noopener noreferrer"
                target="_blank"
              />
              <Link
                aria-label="LinkedIn"
                className="icon-[mdi--linkedin] text-2xl text-gray-700 transition-colors hover:text-blue-700"
                href="https://www.linkedin.com/company/yourcompany"
                rel="noopener noreferrer"
                target="_blank"
              />
              <Link
                aria-label="Twitter"
                className="icon-[mdi--twitter] text-2xl text-gray-700 transition-colors hover:text-blue-500"
                href="https://twitter.com/yourusername"
                rel="noopener noreferrer"
                target="_blank"
              />
              <Link
                aria-label="Facebook"
                className="icon-[mdi--facebook] text-2xl text-gray-700 transition-colors hover:text-blue-600"
                href="https://www.facebook.com/yourpage"
                rel="noopener noreferrer"
                target="_blank"
              />
              <Link
                aria-label="TikTok"
                className="icon-[simple-icons--tiktok] text-2xl text-gray-700 transition-colors hover:text-black"
                href="https://www.tiktok.com/@yourusername"
                rel="noopener noreferrer"
                target="_blank"
              />
            </div>
          </div>

          {/* Newsletter */}
          <div className="mx-auto mb-20 max-w-xl text-center">
            <h4 className="mb-2 text-left font-serif text-sm">NEWSLETTER</h4>
            <p className="mb-4 text-left text-gray-500 text-xs">
              Explore the latest series
            </p>

            {/* 成功消息 */}
            {showSuccessMessage && (
              <div className="mb-3 flex items-center gap-2 rounded bg-green-50 px-3 py-2 text-left text-green-700 text-xs">
                <div className="icon-[mdi--check-circle] text-lg" />
                <span>
                  Subscription successful! Thank you for your subscription
                </span>
              </div>
            )}

            {/* 错误消息 */}
            {emailError && (
              <div className="mb-3 flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-left text-red-700 text-xs">
                <div className="icon-[mdi--alert-circle] text-lg" />
                <span>{emailError}</span>
              </div>
            )}

            <form
              className="flex flex-col space-y-2"
              onSubmit={handleSubscribe}
            >
              <div
                className={`flex border-b pb-2 transition-colors ${
                  emailError
                    ? "border-red-500"
                    : showSuccessMessage
                      ? "border-green-500"
                      : "border-black"
                }`}
              >
                <input
                  className="flex-1 bg-transparent text-sm placeholder-gray-400 focus:outline-none disabled:opacity-50"
                  disabled={subscribeMutation.isPending}
                  onChange={handleEmailChange}
                  placeholder="E-mail Address"
                  type="email"
                  value={email}
                />
                <button
                  className={`font-bold text-xs uppercase tracking-widest transition-colors disabled:cursor-not-allowed ${
                    subscribeMutation.isPending
                      ? "text-gray-400"
                      : showSuccessMessage
                        ? "text-green-600 hover:text-green-700"
                        : "hover:text-gray-600"
                  }`}
                  disabled={subscribeMutation.isPending || !email.trim()}
                  type="submit"
                >
                  {subscribeMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="icon-[mdi--loading] animate-spin text-sm" />
                      订阅中...
                    </span>
                  ) : showSuccessMessage ? (
                    <span className="flex items-center gap-1">
                      <span className="icon-[mdi--check] text-base" />
                      已订阅
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between border-gray-100 border-t pt-8 text-center text-gray-400 text-xs tracking-wider md:flex-row">
          <p>
            &copy;{" "}
            {`${new Date().getFullYear()} ${site_copyright?.[0]?.value || "error"}`}{" "}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 md:mt-0 md:flex-nowrap md:justify-start">
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
              WhatsApp +86 {site_phone?.[0]?.value}
            </span>

            {site_erweima?.[0]?.value ? (
              <div className="relative inline-block">
                <Image
                  alt="WhatsApp QR Code"
                  className="h-16 w-16 transition-all duration-300 ease-out hover:scale-200 hover:z-50 hover:shadow-2xl rounded cursor-pointer"
                  height={256}
                  src={site_erweima?.[0]?.value}
                  width={256}
                />
              </div>
            ) : null}

            <span>{site_email?.[0]?.value}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
