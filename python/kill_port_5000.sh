#!/bin/bash

# Kill all processes using port 5000

echo "🔍 Finding processes using port 5000..."
lsof -i :5000 | grep LISTEN

echo ""
echo "🛑 Killing processes..."
lsof -ti :5000 | xargs kill -9

echo ""
echo "✅ Port 5000 is now free!"
echo ""
echo "💡 Next steps:"
echo "   1. Restart Blender"
echo "   2. Run the startup script in Blender console:"
echo "      exec(open('/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py').read())"
echo "   3. Try the mobile app dispense button again"
