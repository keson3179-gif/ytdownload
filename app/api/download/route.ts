import ytdl from "@distube/ytdl-core";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Hobby 約 10–60s；Pro 可改為 300 並同步 vercel.json */
export const maxDuration = 60;

function asciiFilename(name: string, fallback: string) {
  const trimmed = name.trim() || fallback;
  return trimmed.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim() ?? "";
  const type = searchParams.get("type") === "audio" ? "audio" : "video";

  if (!url || !ytdl.validateURL(url)) {
    return Response.json({ error: "請提供有效的 YouTube 網址" }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const titleRaw = info.videoDetails.title || "download";
    const baseName = asciiFilename(titleRaw, "download");

    let stream: Readable;
    let filename: string;
    let contentType: string;

    if (type === "audio") {
      const format = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio",
      });
      if (!format) {
        return Response.json(
          { error: "此影片無可用的僅音訊格式，請改試「影片」或改用本機 yt-dlp 腳本。" },
          { status: 422 }
        );
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
        return Response.json(
          {
            error:
              "此影片沒有可單檔下載的畫質（多為高畫質僅提供分流）。請改用本機 scripts/youtube_download.py + yt-dlp，或接受較低畫質時可至 YouTube 網頁確認是否仍有合併格式。",
          },
          { status: 422 }
        );
      }
      stream = ytdl.downloadFromInfo(info, { format });
      const ext = format.container === "webm" ? "webm" : "mp4";
      filename = `${baseName}.${ext}`;
      contentType = format.mimeType?.split(";")[0] ?? "video/mp4";
    }

    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) =>
      "%" + c.charCodeAt(0).toString(16).toUpperCase()
    );

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "下載失敗";
    return Response.json(
      { error: message.includes("private") ? "私人或無法存取的影片" : message },
      { status: 502 }
    );
  }
}
