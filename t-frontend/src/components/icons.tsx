import { type SVGProps } from "react";

/**
 * Hand-rolled icon set rather than an icon package: the design language calls
 * for square caps and mitred joins throughout, which no off-the-shelf set ships
 * by default, and a handful of glyphs is not worth a runtime dependency.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </Icon>
  );
}

export function GoalsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.5" />
    </Icon>
  );
}

export function MealsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </Icon>
  );
}

export function LogMealIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 3v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V3" />
      <path d="M6.5 3v9" />
      <path d="M6.5 12v9" />
      <path d="M17.5 3c-1.5 2-2 4-2 6s.8 3 2 3 2-1 2-3-.5-4-2-6z" />
      <path d="M17.5 12v9" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="M6 18L18 6M6 6l12 12" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <circle cx="12" cy="5" r="0.6" />
      <circle cx="12" cy="12" r="0.6" />
      <circle cx="12" cy="19" r="0.6" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </Icon>
  );
}

/** Sliders rather than a gear: a cog's curves fight the square-capped set. */
export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7h11M18 7h3" />
      <path d="M3 17h4M11 17h10" />
      <rect x="14" y="4.5" width="4" height="5" />
      <rect x="7" y="14.5" width="4" height="5" />
    </Icon>
  );
}

/** Appearance: a disc half filled, reading as the light/dark contrast itself. */
export function ContrastIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Marks the security panel and its OTP-gated actions. */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l8 3v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6z" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 21H3V3h6" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Icon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h4l2-3h6l2 3h4v12H3z" />
      <circle cx="12" cy="13" r="4" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16" />
      <path d="M9 6V3h6v3" />
      <path d="M6 6l1 15h10l1-15" />
    </Icon>
  );
}

/** A bar chart icon for the Reports section, matching the square-capped set. */
export function ReportsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h16" />
      <path d="M6 20V14" />
      <path d="M10 20V10" />
      <path d="M14 20V6" />
      <path d="M18 20V4" />
    </Icon>
  );
}

export function CoffeeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <path d="M6 2v2" />
      <path d="M10 2v2" />
      <path d="M14 2v2" />
    </Icon>
  );
}

export function BowlIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h16a8 8 0 0 1-16 0z" />
      <path d="M4 12v-2" />
      <path d="M20 12v-2" />
      <path d="M10 5v3" />
      <path d="M14 5v3" />
    </Icon>
  );
}

export function AppleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.5c-4.5 0-8-3.5-8-8 0-5 3.5-8 8-8s8 3 8 8-3.5 8-8 8z" />
      <path d="M12 4.5V2" />
      <path d="M12 4.5c-1.5-1-3-1-3-1" />
    </Icon>
  );
}

export function PhotoUploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 14v7H3V3h11" />
      <path d="M3 17l5-5 4 4 3-3 6 6" />
      <path d="M19 2v7" />
      <path d="M16 5l3-3 3 3" />
    </Icon>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H5v18h14V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </Icon>
  );
}

/**
 * An entity on the left splitting / breaking outward into multiple forward streams,
 * depicting parsing or decomposing a single source into multiple components.
 */
export function ParseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="9.5" width="5" height="5" />
      <path d="M7 12h2.5 M9.5 12l4-6h5.5 M9.5 12h9.5 M9.5 12l4 6h5.5" />
      {/* <path d="M16.5 3.5l3 2.5-3 2.5 M16.5 9.5l3 2.5-3 2.5 M16.5 15.5l3 2.5-3 2.5" /> */}
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5" />
      <path d="M12 18h.01" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12l5 5L20 6" />
    </Icon>
  );
}

export function EmptyPlateIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Fork on the left */}
      <path d="M10 18v8a2.5 2.5 0 0 0 2.5 2.5h0a2.5 2.5 0 0 0 2.5-2.5v-8" />
      <path d="M12.5 18v8" />
      <path d="M12.5 28.5v17.5" />

      {/* Empty Plate */}
      <circle cx="32" cy="32" r="16" />
      <circle cx="32" cy="32" r="10.5" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />

      {/* Knife on the right */}
      <path d="M51.5 18c-2 2.5-3 6.5-3 10.5 0 1.5.5 2.5 1.5 3.5v14" />
    </svg>
  );
}

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" {...props}>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15.5-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15.5 6.7L3 16" />
    </Icon>
  );
}
