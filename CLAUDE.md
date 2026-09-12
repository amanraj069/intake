# INTAKE

This project strictly adheres to a premium, minimalistic design language.

## Core Rules
1. **Modern Softness:** Use rounded corners (`rounded-xl` or `rounded-2xl`) for cards, dialogs, and large UI elements. Use softer shadows (`shadow-sm`) to create depth.
2. **Typography First:** Use the Inter typeface. Prioritize stark contrast, varied font weights (e.g., extremely light for secondary text, very bold for headers). Use standard sentence case or title case where appropriate; don't rely exclusively on heavy uppercase tracking. Do not use em-dashes (-); use standard hyphens (-) or colons (:) instead.
3. **Airy & Distinct Backgrounds:** Use a soft off-white or light gray for the main application background (e.g., `--color-bg-app`), and pure white for card surfaces (`--color-bg-card`). This creates a clean, readable layout without relying on heavy borders.
4. **Structured Layouts:** Rely on whitespace, card backgrounds, and subtle shadows to separate content instead of relying exclusively on visible grid lines or harsh borders.
5. **Mobile Responsive Priority:** The UI must be fully phone responsive. Ensure flexible layouts (using flex/grid), appropriate padding on small screens (e.g., `px-4 sm:px-8`), and collapse/hide non-essential navigation items on mobile to maintain the clean aesthetic.
6. **No Clutter:** Remove all unnecessary elements. Data points should be displayed in a clean label-value pairing.
7. **Micro-interactions:** Hover states should be snappy. Cards and interactive elements can elevate or highlight slightly on hover.

### Semantic Nutrient Colours
Each macro/nutrient has its own colour, used for tinted card backgrounds, progress bars, and chart series. These are the only places colour deviates from the monochrome base:
- **Protein** — coral/red (`--color-protein` tokens)
- **Carbs** — golden amber (`--color-carbs` tokens)
- **Fat** — lavender/purple (`--color-fat` tokens)
- **Calories** — teal/emerald (`--color-calories` tokens)

Each colour ships in three intensities: full (text/icons), muted (fills), and bg (card backgrounds). Dark mode variants are prefixed with `--color-dark-*`.

The prompt should be fully detailed, and the theme should be consistent

## Code Quality Standards

Every piece of code produced for this project, backend or frontend, must satisfy these rules before it's considered done. These map directly to how the submission will be evaluated, so treat them as hard requirements, not suggestions.

1. **Clean Code**
   - Names must say what the thing is or does: no `data2`, `temp`, `handleStuff`, `x`. A reader should understand a function's purpose from its name and signature alone, without reading the body.
   - Prefer early returns and guard clauses over nested if/else pyramids.
   - No function should try to do more than one thing. If a function needs a comment like "// now handle the other case", it should probably be two functions.
   - No dead code, no commented-out blocks left behind, no `console.log` debugging left in.

2. **Modularity**
   - Backend: strict separation between `routes` (wiring only), `controllers` (request/response handling), `services` (business logic), `models` (schema), and `lib`/`utils` (shared helpers). Business logic never lives directly in a route file.
   - Frontend: shared logic goes in hooks (`useX`) or `lib/`, not copy-pasted across components. UI primitives (`Button`, `Input`, `Card`, etc.) are reused everywhere, never redefined per page.
   - Any function or component pushing past roughly 40-50 lines is a signal to extract a helper. Any file pushing past roughly 200-300 lines is a signal to split it.
   - No monolithic "god files" (e.g., a single `routes.ts` or `page.tsx` handling everything for a whole feature).

3. **Documentation**
   - The root `README.md` must include: what the app does, tech stack, setup steps (env vars, install, DB setup, run commands for both `t-frontend` and `t-backend`), and an "Assumptions" section listing every non-obvious decision made when the spec was ambiguous (e.g., how goals are versioned, what units are assumed for quantities, how micronutrients are modeled).
   - Every non-trivial API endpoint gets a one-line description of what it does, its params, and its response shape, either in the README or a short `API.md`.

4. **Error Handling**
   - Implement proper error handling and input validation to ensure robustness and a good user experience. Never silently swallow errors.
   - Handle:
     - Invalid requests
     - Authentication failures
     - Authorization failures
     - Missing resources
     - Database failures
     - External API failures
     - AI failures
     - File processing failures
   - Every API route validates its input (zod) before touching business logic, and returns a consistent error shape (e.g., `{ error: { message, code } }`) on failure, never a raw stack trace.
   - Every async operation that can fail (DB calls, external API calls, file/image processing) is wrapped in proper try/catch, with a meaningful error surfaced to the caller, not swallowed silently.
   - The frontend never leaves the user looking at a blank screen or an unhandled console error on failure: every fetch has a loading state, an error state, and a way to retry or recover.

5. **Comments (used sparingly, only where they earn their place)**
   - No comments that restate what the code already says (`// increment i by 1` above `i++`).
   - Comments are reserved for explaining *why*, not *what*: a non-obvious architectural choice, a workaround for a library quirk, or a trade-off that isn't visible from the code itself.

When these standards and the design rules above conflict with speed, the design rules can bend slightly under time pressure; these code quality standards should not. Broken auth or reports are forgivable if noted as a known gap in the README; sloppy, unreadable code is not.
