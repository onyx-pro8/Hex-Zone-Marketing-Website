import type { Connect, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { loadChannelVideos } from "./api/youtubeChannel.ts";

function youtubeVideos(): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const path = req.url?.split("?")[0];
    if (path !== "/api/youtube-videos") {
      next();
      return;
    }
    const payload = await loadChannelVideos();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  };

  return {
    name: "youtube-videos",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), youtubeVideos()],
});
