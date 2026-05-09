import ytdl from "@distube/ytdl-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim() ?? "";
  const type = searchParams.get("type") === "audio" ? "audio" : "video";

  if (!url || !ytdl.validateURL(url)) {
    return Response.json({ ok: false, error: "請提供有效的 YouTube 網址" }, { status: 400 });
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
        return Response.json(
          {
            ok: false,
            error:
              "此影片無可用的僅音訊格式，請改試「影片」或改用本機 youtube_download.py。",
          },
          { status: 422 }
        );
      }
    } else {
      const format = ytdl.chooseFormat(info.formats, {
        filter: "videoandaudio",
        quality: "highest",
      });
      if (!format) {
        return Response.json(
          {
            ok: false,
            error:
              "沒有可單檔下載的畫質（高畫質多需本機 yt-dlp 合併）。",
          },
          { status: 422 }
        );
      }
    }

    return Response.json({ ok: true, title });
  } catch (e) {
    const message = e instanceof Error ? e.message : "無法讀取影片資訊";
    return Response.json(
      {
        ok: false,
        error: message.includes("private") ? "私人或無法存取的影片" : message,
      },
      { status: 502 }
    );
  }
}
