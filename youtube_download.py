#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
YouTube 影片／音訊下載（使用 yt-dlp）。

需先安裝 FFmpeg（合併影音、轉 MP3 時需要）：
  https://ffmpeg.org/download.html
  Windows 可用 winget：winget install FFmpeg
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import yt_dlp
except ImportError:
    print("請先安裝依賴：pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)


def build_opts(
    *,
    audio_only: bool,
    out_dir: Path,
    audio_format: str,
    video_quality: str | None,
) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    common: dict = {
        "outtmpl": str(out_dir / "%(title)s [%(id)s].%(ext)s"),
        "noplaylist": True,
        "ignoreerrors": False,
        "retries": 5,
        "fragment_retries": 5,
    }

    if audio_only:
        common["format"] = "bestaudio/best"
        common["postprocessors"] = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": audio_format,
                "preferredquality": "192",
            }
        ]
        return common

    # 影片：依參數選畫質
    if video_quality == "best":
        common["format"] = "bestvideo+bestaudio/best"
        common["merge_output_format"] = "mp4"
    elif video_quality == "720":
        common["format"] = (
            "bestvideo[height<=720]+bestaudio/best[height<=720]/best"
        )
        common["merge_output_format"] = "mp4"
    elif video_quality == "1080":
        common["format"] = (
            "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
        )
        common["merge_output_format"] = "mp4"
    else:
        common["format"] = "bv*+ba/b"

    return common


def main() -> None:
    parser = argparse.ArgumentParser(
        description="下載 YouTube 影片或僅音訊（MP3/M4A 等）"
    )
    parser.add_argument(
        "urls",
        nargs="+",
        help="一個或多個 YouTube 網址",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("downloads"),
        help="輸出資料夾（預設：./downloads）",
    )
    parser.add_argument(
        "-a",
        "--audio",
        action="store_true",
        help="只下載音訊並轉檔",
    )
    parser.add_argument(
        "--audio-format",
        default="mp3",
        choices=["mp3", "m4a", "opus", "wav", "flac"],
        help="僅在 --audio 時有效（預設：mp3）",
    )
    parser.add_argument(
        "-q",
        "--quality",
        choices=["best", "1080", "720"],
        default="best",
        help="影片最高畫質上限（預設：best；--audio 時忽略）",
    )

    args = parser.parse_args()
    opts = build_opts(
        audio_only=args.audio,
        out_dir=args.output,
        audio_format=args.audio_format,
        video_quality=None if args.audio else args.quality,
    )

    with yt_dlp.YoutubeDL(opts) as ydl:
        error_code = ydl.download(args.urls)

    sys.exit(0 if error_code == 0 else 1)


if __name__ == "__main__":
    main()
