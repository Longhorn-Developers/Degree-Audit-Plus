import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],

	manifest: {
		name: "Degree Audit + by LHD",
		description:
			"Created by Longhorn Developers (LHD) to enhance the degree planning experience for students at the University of Texas at Austin.",
		version: "1.0.0",
		manifest_version: 3,
		action: {
			default_popup: "index.html",
		},
		icons: {
			"16": "icon/LHD Logo.png",
			"32": "icon/LHD Logo.png",
			"48": "icon/LHD Logo.png",
			"128": "icon/LHD Logo.png",
			"256": "icon/LHD Logo.png",
		},

		permissions: ["storage", "tabs", "scripting"],
		// Allow injecting scripts into UTDirect pages or via activeTab when user clicks
		host_permissions: ["https://utdirect.utexas.edu/*"],
		optional_host_permissions: [],
		optional_permissions: ["activeTab"],
	},

	vite: () => ({
		css: {
			postcss: {
				plugins: [require("@tailwindcss/postcss"), require("autoprefixer")],
			},
		},
	}),
});
