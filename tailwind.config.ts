
import type { Config } from "tailwindcss";

export default {
	content: ["./src/pages/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ['var(--font-onest)', 'system-ui', 'sans-serif'],
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
