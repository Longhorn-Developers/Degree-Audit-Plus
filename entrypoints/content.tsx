import { createRoot } from "react-dom/client";
import Banner from "./components/banner";
import "./styles/content.css";

export default defineContentScript({
	matches: ["https://utdirect.utexas.edu/*"],
	main() {
		console.log("Content script loaded.");

		const container = document.createElement("div");
		container.id = "dap-banner-root";
		document.body.prepend(container);

		const root = createRoot(container);
		root.render(<Banner />);
	},
});
