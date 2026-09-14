"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import Navbar from "./Navbar";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex pt-14">
        {/* Left panel - hero image (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <Image
            src="/auth-hero-light.png"
            alt="Abstract geometric design light"
            fill
            sizes="50vw"
            className="object-cover dark:hidden"
            priority
          />
          <Image
            src="/auth-dark.png"
            alt="Abstract geometric design dark"
            fill
            sizes="50vw"
            className="object-cover hidden dark:block"
            priority
          />
        </div>

        {/* Right panel - form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-6 sm:px-6 sm:py-12 bg-bg-primary dark:bg-dark-bg">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </>
  );
}
