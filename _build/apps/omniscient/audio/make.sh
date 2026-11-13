#!/usr/bin/env bash
# 重新錄製全知的配樂與音效：合成 → 母帶 → 轉 MP3 → 放進 src/audio/（build.py 會整包複製到 apps/omniscient/audio/）
set -euo pipefail
cd "$(dirname "$0")"
python3 theme.py
python3 sfx.py
mkdir -p ../src/audio
ffmpeg -v error -y -i out/theme.wav -c:a libmp3lame -q:a 2 ../src/audio/theme.mp3
cp out/theme.json ../src/audio/theme.json
for f in out/sfx/*.wav; do
  ffmpeg -v error -y -i "$f" -c:a libmp3lame -q:a 2 "../src/audio/$(basename "$f" .wav).mp3"
done
echo "OK → $(cd ../src/audio && pwd)"
