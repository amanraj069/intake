import Navbar from "@/components/Navbar";
import HeroSection from "@/components/home/HeroSection";
import ShowcaseSection from "@/components/home/ShowcaseSection";
import ClosingCta from "@/components/home/ClosingCta";
import HomeFooter from "@/components/home/HomeFooter";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="top" className="min-h-screen overflow-x-hidden bg-bg-app dark:bg-dark-bg-app text-text-primary dark:text-dark-text">
        <HeroSection />
        <ShowcaseSection />
        <ClosingCta />
      </main>
      <HomeFooter />
    </>
  );
}
