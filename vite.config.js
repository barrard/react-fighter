import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const projectRoot = path.resolve(__dirname);
    const sharedDir = path.resolve(projectRoot, "../shared");

    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                "@": path.resolve(projectRoot, "./src"),
                "@shared": sharedDir,
            },
        },
        server: {
            port: 1549,
            host: true,
            allowedHosts: ["fight.raveaboutdave.com"],
            hmr: {
                host: "fight.raveaboutdave.com",
                port: 1549,
                protocol: "wss",
            },
            fs: {
                allow: [projectRoot, sharedDir],
            },
        },
        preview: {
            allowedHosts: ["fight.raveaboutdave.com"],
        },
        define: {
            // Make env vars available to the client
            "process.env": env,
        },
    };
});
