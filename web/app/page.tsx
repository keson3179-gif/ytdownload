"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"video" | "audio">("video");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const u = url.trim();
    if (!u) {
      setError("請貼上 YouTube 網址");
      return;
    }
    setBusy(true);
    try {
      const infoRes = await fetch(
        `/api/info?url=${encodeURIComponent(u)}&type=${type}`
      );
      const infoJson = (await infoRes.json()) as {
        ok?: boolean;
        error?: string;
        title?: string;
      };
      if (!infoRes.ok || !infoJson.ok) {
        setError(infoJson.error ?? `錯誤：${infoRes.status}`);
        return;
      }
      window.location.assign(
        `/api/download?url=${encodeURIComponent(u)}&type=${type}`
      );
    } catch {
      setError("無法連線，請稍後再試");
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          YouTube 下載
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          貼上連結後選擇影片或音訊。雲端版僅能使用 YouTube
          仍提供的單檔串流；超時或高畫質合併請用本機{" "}
          <code className="rounded bg-black/30 px-1 font-mono text-xs">
            youtube_download.py
          </code>
          。
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="url" className="sr-only">
              YouTube 網址
            </label>
            <input
              id="url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)] outline-none ring-[var(--accent)] focus:ring-2"
            />
          </div>

          <fieldset className="flex gap-4 text-sm">
            <legend className="sr-only">類型</legend>
            <label className="flex cursor-pointer items-center gap-2 text-[var(--text)]">
              <input
                type="radio"
                name="type"
                checked={type === "video"}
                onChange={() => setType("video")}
                className="accent-[var(--accent)]"
              />
              影片
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[var(--text)]">
              <input
                type="radio"
                name="type"
                checked={type === "audio"}
                onChange={() => setType("audio")}
                className="accent-[var(--accent)]"
              />
              音訊
            </label>
          </fieldset>

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--accent-dim)] py-3 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "準備中…" : "開始下載"}
          </button>
        </form>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        請遵守著作權與 YouTube 服務條款；僅下載你有權使用的內容。
      </p>
    </main>
  );
}
