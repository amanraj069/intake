"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col bg-bg-primary dark:bg-dark-bg text-text-primary dark:text-dark-text pt-14">
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-6xl mx-auto w-full">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter mb-6 max-w-3xl leading-tight">
            The ultimate starting point.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-text-secondary dark:text-dark-text-secondary max-w-xl mb-12 px-4">
            A premium, minimal, and fully-functional foundation for your next big idea. Built with uncompromising design.
          </p>
          {!loading && !user && (
            <Link href="/signup">
              <Button size="lg" className="px-8 sm:px-10 text-xs sm:text-sm tracking-widest uppercase w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
          )}
        </main>
      </div>
    </>
  );
}
