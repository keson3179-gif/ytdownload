import type ytdl from "@distube/ytdl-core";

type YtdlGetInfoOptions = NonNullable<Parameters<typeof ytdl.getInfo>[1]>;

/**
 * 與 YouTube 通訊的選項：可選登入 Cookie（環境變數 YOUTUBE_COOKIE），並輪替 player client 以降低機器人驗證。
 * Cookie 僅應放在伺服器環境變數，切勿寫進前端或公開 repo。
 */
export function getYtdlOptions(): YtdlGetInfoOptions {
  const cookie = process.env.YOUTUBE_COOKIE?.trim();
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
  };
  if (cookie) {
    headers.Cookie = cookie;
  }
  return {
    requestOptions: { headers },
    playerClients: ["TV", "IOS", "ANDROID", "WEB_EMBEDDED", "WEB"],
  };
}

export function formatYoutubeErrorForUser(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/sign in to confirm|not a bot|bot\s*check/i.test(message)) {
    return "YouTube 觸發機器人驗證（匿名請求被拒）。若為自用部署：到 Vercel → Settings → Environment Variables 新增 YOUTUBE_COOKIE，值為在已登入 YouTube 的瀏覽器內匯出的 Cookie 字串（勿外流）。或改用本機 scripts/youtube_download.py + yt-dlp。";
  }
  if (/private video|is private/i.test(message)) {
    return "私人或無法存取的影片";
  }
  return message;
}
