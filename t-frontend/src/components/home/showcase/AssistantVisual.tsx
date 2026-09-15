/** A condensed chat turn: the user's message, then the proposal they confirm. */
export default function AssistantVisual() {
  return (
    <div className="space-y-1.5 sm:space-y-3 text-xs sm:text-sm">
      <p className="ml-auto w-fit max-w-[85%] rounded-xl sm:rounded-2xl rounded-br-md bg-accent-muted dark:bg-accent-dark-muted px-2.5 py-1.5 sm:px-4 sm:py-2.5 text-[11px] sm:text-sm text-white">
        Had dal and two rotis for lunch
      </p>
      <div className="max-w-[92%] rounded-xl sm:rounded-2xl rounded-bl-md bg-bg-app dark:bg-dark-bg-app p-2.5 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium text-text-secondary dark:text-dark-text-secondary">Log to Lunch?</p>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold text-text-primary dark:text-dark-text">
          520 kcal <span className="font-light text-text-secondary dark:text-dark-text-secondary">· 21g protein</span>
        </p>
        <div className="mt-2 sm:mt-3 flex gap-2 text-[10px] sm:text-xs font-semibold">
          <span className="rounded-lg bg-text-primary dark:bg-dark-text px-2 py-1 sm:px-3 sm:py-1.5 text-bg-card dark:text-dark-bg-card">Confirm</span>
          <span className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-text-secondary dark:text-dark-text-secondary">Edit</span>
        </div>
      </div>
    </div>
  );
}
