npm run dev &
PID=$!

sleep 1

if [[ "$(uname)" == "Darwin" ]]; then
  open "http://localhost:5173"
else
  xdg-open "http://localhost:5173"
fi

wait $PID
