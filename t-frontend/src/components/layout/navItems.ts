import type { ComponentType, SVGProps } from "react";
import {
  AssistantIcon,
  GoalsIcon,
  LogMealIcon,
  MealsIcon,
  OverviewIcon,
  ReportsIcon,
} from "@/components/icons";

/** The signed-in navigation, in the order it reads in the sidebar. */
export interface NavItem {
  href: string;
  label: string;
  /** Stands in for the label when the sidebar is retracted to its icon rail. */
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Overview", Icon: OverviewIcon },
  { href: "/reports", label: "Reports", Icon: ReportsIcon },
  { href: "/meals", label: "Meals", Icon: MealsIcon },
  { href: "/log-meal", label: "Log Meal", Icon: LogMealIcon },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/chat", label: "Assistant", Icon: AssistantIcon },
];

/** A nested route such as `/meals/:id/edit` keeps its parent link highlighted. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
