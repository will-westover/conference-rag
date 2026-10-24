import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // GitHub Pages serves this site from /conference-rag/, so every built asset URL needs that prefix
    base: '/conference-rag/',
    resolve: {
        // "@/features/search/api" instead of "../../features/search/api" (mirrors "paths" in tsconfig.app.json)
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // Build-time constant: Vite pastes this literal into the bundle (shown as "Updated: ..." in the corner)
    define: {
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    test: {
        environment: 'node',
    },
});
