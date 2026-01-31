import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],

	dev: {
		server: {
			open: false,
		},
	},

	// Ensure UTF-8 encoding and strip invalid Unicode for Chrome extension compatibility
	hooks: {
		"build:done": async (wxt) => {
			const fs = await import("fs");
			const path = await import("path");
			const outDir = wxt.config.outDir;

			function fixEncoding(dir: string) {
				if (!fs.existsSync(dir)) return;
				for (const file of fs.readdirSync(dir)) {
					const fullPath = path.join(dir, file);
					if (fs.statSync(fullPath).isDirectory()) {
						fixEncoding(fullPath);
					} else if (/\.(js|json|html|css)$/.test(file)) {
						let content = fs.readFileSync(fullPath, "utf8");
						// Remove Unicode noncharacters (U+FFFE, U+FFFF) that Chrome rejects
						content = content.replace(/[\uFFFE\uFFFF]/g, "");
						fs.writeFileSync(fullPath, content, "utf8");
					}
				}
			}
			fixEncoding(outDir);
		},
	},

	manifest: {
		name: "Degree Audit + by LHD",
		description:
			"Created by Longhorn Developers (LHD) to enhance the degree planning experience for students at the University of Texas at Austin.",
		version: "1.0.0",
		manifest_version: 3,
		// No default_popup - icon click triggers browser.action.onClicked
		// Popup UI is injected via content script for rounded corners
		action: {},
		icons: {
			"16": "icon/LHD Logo.png",
			"32": "icon/LHD Logo.png",
			"48": "icon/LHD Logo.png",
			"128": "icon/LHD Logo.png",
			"256": "icon/LHD Logo.png",
		},

		permissions: ["storage", "tabs", "scripting", "activeTab", "windows"],
		// Allow injecting scripts into UTDirect pages and all URLs for popup injection
		host_permissions: ["https://utdirect.utexas.edu/*", "<all_urls>"],
		optional_host_permissions: [],
		optional_permissions: [],
		web_accessible_resources: [
			{
				resources: ["Grid.png"],
				matches: ["<all_urls>"],
			},
		],
	},

	vite: () => import("@tailwindcss/postcss").then((tailwindcss) =>
		import("autoprefixer").then((autoprefixer) => ({
			css: {
				postcss: {
					plugins: [tailwindcss.default, autoprefixer.default],
				},
			},
		}))
	),
});
