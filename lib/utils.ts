import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CourseCode } from "./general-types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export async function openDAPMainPage() {
  await browser.runtime.sendMessage({
    action: "openDegreeAudit",
  });
}

export const CATEGORY_COLORS = [
  {
    name: "orange",
    tailwind: "var(--color-dap-orange)",
    className: "bg-dap-orange",
    rgb: "rgb(191, 87, 0)",
  },
  {
    name: "green",
    tailwind: "var(--color-dap-green)",
    className: "bg-dap-green",
    rgb: "rgb(5, 150, 105)",
  },
  {
    name: "pink",
    tailwind: "var(--color-dap-pink)",
    className: "bg-dap-pink",
    rgb: "rgb(236, 72, 153)",
  },
  {
    name: "yellow",
    tailwind: "var(--color-dap-yellow)",
    className: "bg-dap-yellow",
    rgb: "rgb(255, 214, 0)",
  },
  {
    name: "teal",
    tailwind: "var(--color-dap-teal)",
    className: "bg-dap-teal",
    rgb: "rgb(0, 169, 183)",
  },
  {
    name: "purple",
    tailwind: "var(--color-dap-purple)",
    className: "bg-dap-purple",
    rgb: "rgb(79, 70, 229)",
  },
  {
    name: "indigo",
    tailwind: "var(--color-dap-indigo)",
    className: "bg-dap-indigo",
    rgb: "rgb(99, 102, 241)",
  },
  {
    name: "red",
    tailwind: "var(--color-dap-red)",
    className: "bg-dap-red",
    rgb: "rgb(239, 68, 68)",
  },
] as const satisfies {
  name: string;
  tailwind: string;
  className: string;
  rgb: string;
}[];

export function getColorByCourseCode(code: CourseCode) {
  const [department, _] = code.split(" ");
  const departmentSum = department
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[departmentSum % CATEGORY_COLORS.length];
}

export function getColorBySectionTitle(title: string) {
  const titleSum = title
    .toLowerCase()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[titleSum % CATEGORY_COLORS.length];
}

export function getColorByIndex(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
