import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Force CJS loading for jsPDF packages to avoid ESM interop issues
		noExternal: [],
		external: ['jspdf', 'jspdf-autotable']
	}
});
