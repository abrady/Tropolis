python3 -m http.server 8000 &             # start server in background
PID=$!

sleep 1

# Detect macOS vs. everything else
if [[ "$(uname)" == "Darwin" ]]; then     # or: [[ "$OSTYPE" == darwin* ]]
  open "http://localhost:8000"            # macOS: launch default browser
else
  xdg-open "http://localhost:8000"        # Linux/BSD desktops
fi

wait $PID                                 # keep script alive until server exits
