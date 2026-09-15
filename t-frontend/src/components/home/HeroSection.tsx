import LoggingFlowIllustration from "./logging-flow/LoggingFlowIllustration";
import HomeCtaLinks from "./HomeCtaLinks";

const LOGGING_METHODS = ["Photo", "Chat", "Manual", "PDF import"] as const;

export default function HeroSection() {
  return (
    <section className="flex items-center px-4 sm:px-8 pt-20 pb-12 sm:pt-32 sm:pb-24 lg:min-h-svh lg:pt-28 lg:pb-20">
      {/* Mobile: flex-col with title → illustration → text → CTA */}
      {/* Desktop (lg): side-by-side two-column grid */}
      <div className="mx-auto w-full max-w-6xl flex flex-col lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-12">

        {/* ── Title (mobile: top; desktop: col-1 top) ── */}
        <h1 className="lg:hidden animate-fade-up text-[1.35rem] font-extrabold tracking-tight leading-[1.1] text-text-primary dark:text-dark-text mt-6 mb-8 text-center">
          Every meal, measured.
        </h1>

        {/* ── Illustration (mobile: below title; desktop: col-2) ── */}
        <div className="lg:mt-0 lg:order-2 w-full animate-scale-in delay-75">
          <LoggingFlowIllustration />
        </div>

        {/* ── Text + CTA (mobile: below illustration; desktop: col-1) ── */}
        <div className="lg:order-1 mt-10 lg:mt-0">
          {/* Desktop-only title */}
          <h1 className="hidden lg:block animate-fade-up text-5xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] text-text-primary dark:text-dark-text whitespace-normal">
            Every meal,{" "}
            <br />
            measured.
          </h1>

          <p className="animate-fade-up delay-150 mt-3 lg:mt-7 max-w-[220px] mx-auto sm:max-w-md sm:mx-0 lg:max-w-md lg:mx-0 text-xs sm:text-base lg:text-lg font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary text-center sm:text-left">
            Intake turns a photo, a sentence, or an old food diary into precise calories and macros, then
            holds them up against goals built for your body.
          </p>

          <div className="animate-fade-up delay-250 mt-8 sm:mt-10 flex justify-center lg:justify-start">
            <HomeCtaLinks className="sm:w-auto" />
          </div>

          <dl className="mt-12 hidden sm:flex flex-wrap gap-x-8 gap-y-3 border-t border-border dark:border-dark-border pt-6 animate-fade-up delay-350">
            <dt className="sr-only">Ways to log</dt>
            {LOGGING_METHODS.map((method) => (
              <dd
                key={method}
                className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary transition-colors duration-200 hover:text-accent dark:hover:text-accent-dark select-none"
              >
                {method}
              </dd>
            ))}
          </dl>
        </div>

      </div>
    </section>
  );
}
