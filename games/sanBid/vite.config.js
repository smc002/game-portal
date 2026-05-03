import { defineConfig } from 'vite';
export default defineConfig({
    base: '/sanBid/',
    server: {
        port: 5173,
        open: false,
    },
    build: {
        target: 'es2022',
        sourcemap: true,
    },
});
