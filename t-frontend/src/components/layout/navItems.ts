import type { ComponentType, SVGProps } from "react";
import {
  AssistantIcon,
  GoalsIcon,
  LogMealIcon,
  MealsIcon,
  OverviewIcon,
  ReportsIcon,
  PeopleIcon,
} from "@/components/icons";

/** The signed-in navigation, in the order it reads in the sidebar. */
export interface NavItem {
  href: string;
  label: string;
  /** Stands in for the label when the sidebar is retracted to its icon rail. */
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Shows a red dot while meals shared with the user are still unseen. */
  showsUnseenShares?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Overview", Icon: OverviewIcon },
  { href: "/reports", label: "Reports", Icon: ReportsIcon },
  { href: "/meals", label: "Meals", Icon: MealsIcon },
  { href: "/log-meal", label: "Log Meal", Icon: LogMealIcon },
  { href: "/shared", label: "Shared", Icon: PeopleIcon, showsUnseenShares: true },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/chat", label: "Assistant", Icon: AssistantIcon },
];

/** A nested route such as `/meals/:id/edit` keeps its parent link highlighted. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
