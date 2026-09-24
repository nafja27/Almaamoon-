#!/bin/bash
# تشغيل مغامرة المأمون على جهاز Mac (يلزم لتفعيل الميكروفون)
cd "$(dirname "$0")"
PORT=8765
python3 -m http.server "$PORT" >/tmp/almaamoon_v33_server.log 2>&1 &
PID=$!
sleep 1
open "http://localhost:$PORT/index.html"
wait $PID
