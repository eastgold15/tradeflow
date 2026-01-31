"use client";

import { useState, useEffect } from "react";
import { useSubscribeNewsletter } from "@/hooks/api/newsletter-hook";

export const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const subscribeMutation = useSubscribeNewsletter();

  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError("请输入邮箱地址");
      return;
    }
    subscribeMutation.mutate(email, {
      onSuccess: () => {
        setEmail("");
        setShowSuccessMessage(true);
      },
    });
  };

  return (
    <div className=" max-w-xl text-center">
      <h4 className="mb-2 md:text-left font-serif text-sm">NEWSLETTER</h4>
      <p className="mb-4 md:text-left text-gray-500 text-xs">Explore the latest series</p>

      {showSuccessMessage && (
        <div className="mb-3 flex items-center gap-2 rounded bg-green-50 px-3 py-2  md:text-left text-green-700 text-xs">
          <div className="icon-[mdi--check-circle] text-lg" />
          <span>Subscription successful!</span>
        </div>
      )}

      {emailError && (
        <div className="mb-3 flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-left text-red-700 text-xs">
          <div className="icon-[mdi--alert-circle] text-lg" />
          <span>{emailError}</span>
        </div>
      )}

      <form className="flex flex-col space-y-2" onSubmit={handleSubscribe}>
        <div className={`flex border-b pb-2 transition-colors ${emailError ? "border-red-500" : "border-black"}`}>
          <input
            className="flex-1 min-w-0 
             md:text-start bg-transparent text-sm focus:outline-none disabled:opacity-50"
            disabled={subscribeMutation.isPending}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail Address"
            type="email"
            value={email}
          />
          <button
            className="font-bold text-xs uppercase disabled:text-gray-400  hover:text-black"
            disabled={subscribeMutation.isPending || !email.trim()}
            type="submit"
          >
            {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
          </button>
        </div>
      </form>
    </div>
  );
};