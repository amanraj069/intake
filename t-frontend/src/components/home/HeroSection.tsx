import LoggingFlowIllustration from "./logging-flow/LoggingFlowIllustration";
import HomeCtaLinks from "./HomeCtaLinks";

const LOGGING_METHODS = ["Photo", "Chat", "Manual", "PDF import"] as const;

export default function HeroSection() {
  return (
    <section className="flex items-center px-4 sm:px-8 pt-20 pb-12 sm:pt-32 sm:pb-24 lg:min-h-svh lg:pt-28 lg:pb-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 sm:gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
        <div className="order-2 lg:order-1">
          <h1 className="animate-fade-up text-[1.35rem] sm:text-5xl lg:text-7xl font-extrabold tracking-tight sm:tracking-tighter leading-[1.1] sm:leading-[0.95] text-text-primary dark:text-dark-text whitespace-nowrap sm:whitespace-normal">
            Every meal,{" "}
            <br className="hidden sm:inline" />
            measured.
          </h1>
          <p className="animate-fade-up delay-150 mt-2.5 sm:mt-7 max-w-md text-xs sm:text-base lg:text-lg font-light leading-relaxed text-text-secondary dark:text-dark-text-secondary">
            Intake turns a photo, a sentence, or an old food diary into precise calories and macros, then
            holds them up against goals built for your body.
          </p>
          <div className="animate-fade-up delay-250 w-full sm:w-auto">
            <HomeCtaLinks className="mt-4 sm:mt-10 w-full sm:w-auto" />
          </div>
          <dl className="mt-12 hidden sm:flex flex-wrap gap-x-8 gap-y-3 border-t border-border dark:border-dark-border pt-6 animate-fade-up delay-350">
            <dt className="sr-only">Ways to log</dt>
            {LOGGING_METHODS.map((method) => (
              <dd key={method} className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">
                {method}
              </dd>
            ))}
          </dl>
        </div>

        <div className="order-1 lg:order-2 w-full animate-scale-in delay-75">
          <LoggingFlowIllustration />
        </div>
      </div>
    </section>
  );
}
