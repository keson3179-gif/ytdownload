import type { NextApiRequest, NextApiResponse } from "next";
import ytdl from "@distube/ytdl-core";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method Not Allowed" });
    return;
  }

  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
  const type = req.query.type === "audio" ? "audio" : "video";

  if (!url || !ytdl.validateURL(url)) {
    res.status(400).json({ ok: false, error: "請提供有效的 YouTube 網址" });
    return;
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title ?? "";

    if (type === "audio") {
      const format = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio",
      });
      if (!format) {
        res.status(422).json({
          ok: false,
          error:
            "此影片無可用的僅音訊格式，請改試「影片」或改用本機 scripts/youtube_download.py。",
        });
        return;
      }
    } else {
      const format = ytdl.chooseFormat(info.formats, {
        filter: "videoandaudio",
        quality: "highest",
      });
      if (!format) {
        res.status(422).json({
          ok: false,
          error: "沒有可單檔下載的畫質（高畫質多需本機 yt-dlp 合併）。",
        });
        return;
      }
    }

    res.status(200).json({ ok: true, title });
  } catch (e) {
    const message = e instanceof Error ? e.message : "無法讀取影片資訊";
    res.status(502).json({
      ok: false,
      error: message.includes("private") ? "私人或無法存取的影片" : message,
    });
  }
}
