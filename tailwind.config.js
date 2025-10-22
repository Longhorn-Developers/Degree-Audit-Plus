/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./entrypoints/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				staatliches: ["Staatliches", "cursive"],
				"roboto-flex": ["Roboto Flex", "sans-serif"],
			},
		},
	},
	plugins: [],
};
