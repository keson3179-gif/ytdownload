import type { NextApiRequest, NextApiResponse } from "next";
import ytdl from "@distube/ytdl-core";
import type { Readable } from "node:stream";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function asciiFilename(name: string, fallback: string) {
  const trimmed = name.trim() || fallback;
  return trimmed.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.status(405).end("Method Not Allowed");
    return;
  }

  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
  const type = req.query.type === "audio" ? "audio" : "video";

  if (!url || !ytdl.validateURL(url)) {
    res.status(400).json({ error: "請提供有效的 YouTube 網址" });
    return;
  }

  let stream: Readable;

  try {
    const info = await ytdl.getInfo(url);
    const titleRaw = info.videoDetails.title || "download";
    const baseName = asciiFilename(titleRaw, "download");

    let filename: string;
    let contentType: string;

    if (type === "audio") {
      const format = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio",
      });
      if (!format) {
        res.status(422).json({
          error:
            "此影片無可用的僅音訊格式，請改試「影片」或改用本機 scripts/youtube_download.py。",
        });
        return;
      }
      stream = ytdl.downloadFromInfo(info, { format });
      const ext =
        format.container === "mp4" || format.mimeType?.includes("mp4")
          ? "m4a"
          : "webm";
      filename = `${baseName}.${ext}`;
      contentType = format.mimeType?.split(";")[0] ?? "audio/webm";
    } else {
      const format = ytdl.chooseFormat(info.formats, {
        filter: "videoandaudio",
        quality: "highest",
      });
      if (!format) {
        res.status(422).json({
          error:
            "此影片沒有可單檔下載的畫質（多為高畫質僅提供分流）。請改用本機 scripts/youtube_download.py + yt-dlp，或接受較低畫質時可至 YouTube 網頁確認是否仍有合併格式。",
        });
        return;
      }
      stream = ytdl.downloadFromInfo(info, { format });
      const ext = format.container === "webm" ? "webm" : "mp4";
      filename = `${baseName}.${ext}`;
      contentType = format.mimeType?.split(";")[0] ?? "video/mp4";
    }

    const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) =>
      "%" + c.charCodeAt(0).toString(16).toUpperCase()
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encoded}`
    );
    res.setHeader("Cache-Control", "no-store");

    stream.on("error", () => {
      if (!res.writableEnded) {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "下載失敗";
    if (!res.headersSent) {
      res.status(502).json({
        error: message.includes("private") ? "私人或無法存取的影片" : message,
      });
    }
  }
}
