import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export async function openDAPMainPage() {
	await browser.runtime.sendMessage({
		action: "openDegreeAudit",
	});
}
