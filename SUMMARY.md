# Summary - All Changes Made

## ✅ Problem Fixed

**Issue:** Mobile app dispense button shows "Python unreachable: Read timed out"

**Root Cause:** Python socket server port 5000 conflicts with macOS AirPlay Receiver

**Solution:** Changed socket server port from 5000 → 5001

---

## 📝 Files Modified

### 1. Python Configuration
- **`python/config.py`** - Changed PORT from 5000 to 5001
- **`python/main.py`** - Updated log message to show port 5001

### 2. Backend Configuration
- **`server/src/main/resources/application.yml`** - Changed port to 5001
- **`server/src/main/java/com/medicine/backend/PythonSocketClient.java`** - Updated default port to 5001
- Backend recompiled successfully

### 3. Documentation
- **`TESTING_GUIDE_FINAL.md`** - Updated all test commands to use port 5001
- **`README.md`** - Updated quick start and commands reference
- **`START_HERE.md`** - Updated with npm run dev instructions
- **`package.json`** - Added dev:both script, updated dev:mobile to use --lan

### 4. New Files Created
- **`DISPENSE_FIX.md`** - Detailed explanation of the port change fix
- **`START_HERE.md`** - Simplified quick start guide
- **`SUMMARY.md`** - This file
- **`python/kill_port_5000.sh`** - Helper script (not needed with port 5001)

---

## 🚀 New Feature: npm run dev

### What It Does

Running `npm run dev` now:
1. ✅ Auto-detects your LAN IP address
2. ✅ Starts Spring Boot backend (port 8080) in background
3. ✅ Starts Expo mobile app with QR code in foreground
4. ✅ Configures mobile app to connect to backend automatically

### How It Works

The existing `start.sh` script:
- Reads `.env` file for database credentials
- Detects LAN IP using `ipconfig getifaddr en0`
- Writes `mobile/.env` with `EXPO_PUBLIC_API_BASE_URL=http://<lan-ip>:8080`
- Starts Spring Boot with those credentials
- Waits for backend to be ready (checks port 8080)
- Starts Expo with `--lan` flag for QR code

### Commands Available

```bash
npm run dev          # Start backend + mobile (recommended)
npm run dev:server   # Start backend only
npm run dev:mobile   # Start mobile only
npm run dev:both     # Start both with concurrently (parallel)
```

---

## 📋 Complete Workflow

### Daily Development

1. **Start Blender**
   ```python
   # In Blender console:
   exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())
   ```
   ✅ See: `[SocketServer] Listening on 127.0.0.1:5001`

2. **Start Backend + Mobile**
   ```bash
   npm run dev
   ```
   ✅ See: Backend logs, then Expo QR code

3. **Test Mobile App**
   - Scan QR code with Expo Go
   - Login → "Give Medicine Now"
   - Select medicine → Click "Dispense Now"
   - ✅ Success message, tablet falls in Blender!

---

## 🧪 Testing Checklist

### Before Testing Mobile App

- [ ] Blender is running
- [ ] Startup script executed: `startup.py`
- [ ] Log shows: `[SocketServer] Listening on 127.0.0.1:5001`
- [ ] Backend started: `npm run dev`
- [ ] Backend log shows: `Backend is up!`
- [ ] Expo shows QR code
- [ ] Mobile app connected (scan QR)

### Test Commands

```bash
# 1. Test socket server
echo '{"command":"status"}' | nc localhost 5001
# Expected: {"status":"success","C1":{...},...}

# 2. Test backend API
curl http://localhost:8080/api/dispense/status
# Expected: {"status":"success",...}

# 3. Test dispense
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001
# Expected: Disc rotates, tablet falls

# 4. Test reset
echo '{"command":"reset"}' | nc localhost 5001
# Expected: All discs return to 0°, tablets back in pockets
```

---

## 🎯 Success Criteria

### ✅ System Working Correctly When:

1. **Socket Server**
   - Listening on port 5001 (not 5000)
   - Responds to status command
   - No "Address already in use" error

2. **Backend**
   - Starts without errors
   - Can connect to socket on port 5001
   - API endpoint `/api/dispense/status` works

3. **Mobile App**
   - Connects to backend via LAN IP
   - Dispense button works
   - Shows progress: "Dispensing 1 / 1 tablets"
   - Success message appears
   - No "Python unreachable" error

4. **Blender**
   - Disc rotates 40° per dispense
   - Correct tablet falls (detected by angle)
   - Reset restores all tablets to golden state
   - Logs show expected messages

---

## 🐛 Known Issues & Solutions

### Issue: "Address already in use"
**Solution:** Restart Blender (clears old socket)

### Issue: "Connection refused"
**Solution:** Startup script not run in Blender

### Issue: "Python unreachable: Read timed out"
**Solution:** Backend trying wrong port, restart backend after config change

### Issue: Wrong LAN IP detected
**Solution:** Manually edit `mobile/.env` with correct IP

---

## 📊 Port Summary

| Service | Port | Access |
|---------|------|--------|
| Python Socket | 5001 | localhost only |
| Spring Boot | 8080 | LAN (0.0.0.0) |
| Expo Metro | 8081 | LAN |
| PostgreSQL | 5432 | Remote (Neon.tech) |

**Port Change:** 5000 → 5001 (to avoid macOS AirPlay Receiver conflict)

---

## 📚 Documentation Structure

```
medicine-dispenser/
├── README.md                 # Main readme (updated)
├── START_HERE.md            # Quick start (new)
├── TESTING_GUIDE_FINAL.md   # Complete testing (updated)
├── DISPENSE_FIX.md          # Port fix explanation (new)
├── BLENDER_SETUP.md         # Blender setup
├── SUMMARY.md               # This file (new)
└── start.sh                 # Start script (existing)
```

**Read Order for New Users:**
1. START_HERE.md - Quick start
2. README.md - Full overview
3. TESTING_GUIDE_FINAL.md - Complete testing
4. DISPENSE_FIX.md - If timeout errors

---

## 🎓 Key Learnings

### Port Conflict Issue
- macOS uses port 5000 for AirPlay Receiver (ControlCenter)
- Process respawns even after being killed
- Solution: Use different port (5001)

### npm run dev Benefits
- Single command starts everything
- Auto-detects LAN IP for mobile connectivity
- Backend runs in background, mobile in foreground
- Proper log separation (.server.log vs terminal)

### Architecture
```
Mobile App (Expo)
    ↓ HTTP (port 8080)
Spring Boot Backend
    ↓ TCP Socket (port 5001)
Python Socket Server
    ↓ Blender API
Blender Digital Twin
```

---

## ✅ Next Steps for User

1. **Restart Blender** (to clear old port 5000 socket)
2. **Run startup script** in Blender console
3. **Run `npm run dev`** in terminal
4. **Scan QR code** with Expo Go app
5. **Test dispense** - should work now!

---

## 🎉 Final Status

- ✅ Port conflict fixed (5000 → 5001)
- ✅ Backend configuration updated
- ✅ All test commands updated
- ✅ Documentation updated
- ✅ `npm run dev` starts everything
- ✅ Mobile app auto-connects via LAN IP
- ✅ Complete testing guide available
- ✅ Troubleshooting guide included

**System is ready for testing!** 🚀

---

**Last Updated:** August 10, 2026  
**Changes:** Port 5001 + npm run dev automation
