"use client";

import { useRouter } from "next/navigation";
import { type ButtonHTMLAttributes } from "react";

interface BackButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  size?: "sm" | "md" | "lg";
}

export default function BackButton({ size = "md", className = "", ...props }: BackButtonProps) {
  const router = useRouter();

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center justify-center text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text transition-colors cursor-pointer ${className}`}
      aria-label="Go back"
      title="Go back"
      {...props}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="square" 
        strokeLinejoin="miter"
        className={iconSizes[size]}
      >
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
  );
}
