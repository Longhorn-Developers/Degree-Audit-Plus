import { createRoot } from "react-dom/client";
import TryDAPBanner from "./components/banner";

export default defineContentScript({
	matches: ["https://utdirect.utexas.edu/apps/degree/audits/"],
	main() {
		console.log("Content script loaded.");

		insertBannerContainer();
		defineUTDToppageHeight();
	},
});

function insertBannerContainer() {
	const container = document.createElement("div");
	container.id = "dap-banner-root";
	const insertPoint = document.querySelector("#service_content");
	if (insertPoint) {
		insertPoint.before(container);
	} else {
		document.body.prepend(container);
	}

	const root = createRoot(container);
	root.render(<TryDAPBanner />);
}

function defineUTDToppageHeight() {
	const utdToppage = document.querySelector("#utd_toppage");
	if (utdToppage) {
		(utdToppage as HTMLElement).style.height = "96px";
	}
}
