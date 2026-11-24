import { CHANNEL_URL, CHANNEL_VIDEOS } from "../src/data/channelVideos.ts";

export type { ChannelVideo } from "../src/data/channelVideos.ts";

export type ChannelPayload = {
  channelUrl: string;
  videos: typeof CHANNEL_VIDEOS;
  available: boolean;
};

export async function loadChannelVideos(): Promise<ChannelPayload> {
  return {
    channelUrl: CHANNEL_URL,
    videos: CHANNEL_VIDEOS,
    available: true,
  };
}
