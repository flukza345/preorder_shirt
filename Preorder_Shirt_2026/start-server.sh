#!/bin/bash
echo "🚀 Starting local server..."
echo "📂 Server running at: http://localhost:8000"
echo "👉 Admin page: http://localhost:8000/admin.html"
echo "👉 Customer page: http://localhost:8000/index.html"
echo ""
echo "Press Ctrl+C to stop the server"
python3 -m http.server 8000
