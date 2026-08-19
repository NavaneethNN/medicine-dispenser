# 🚀 Medicine Dispenser - Quick Start Guide

## ⚠️ IMPORTANT: Port Change!

**Port 5000 → 5001** to avoid conflict with macOS AirPlay Receiver.

All systems updated. Follow steps below to start testing.

---

## 🔧 Setup (One-Time Only)

### 1. Verify Golden State Exists

Check if tablet positions are saved:

```bash
ls -la /Users/navaneeth/Documents/Projects/medicine-dispenser/python/tablet_positions.json
```

✅ **File exists?** Skip to "Daily Workflow" section.

❌ **File missing?** Run this in Blender console:

```python
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/save_tablet_positions.py").read())
```

---

## 📅 Daily Workflow

### Step 1: Start Blender

1. Open Blender
2. Load your medicine dispenser .blend file: `blender/medicinev2.blend`
3. Switch to **"Scripting"** workspace (top menu)

### Step 2: Run Startup Script

In the Blender Python Console (bottom panel):

```python
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())
```

**Expected Output:**
```
[SocketServer] Listening on 127.0.0.1:5001
✓ System Ready
```

✅ **See port 5001?** Continue to Step 3.

❌ **Error "Address already in use"?** Restart Blender and try again.

### Step 3: Start Backend + Mobile App (One Command!)

From the project root:

```bash
npm run dev
```

This will:
1. ✅ Auto-detect your LAN IP
2. ✅ Start Spring Boot backend (port 8080)
3. ✅ Start Expo mobile app with QR code

**Expected Output:**
```
LAN IP detected: 192.168.x.x
API base URL set to: http://192.168.x.x:8080
Starting Spring Boot backend...
Backend PID: xxxxx (logs → .server.log)
Waiting for backend on :8080 ...
Backend is up!

› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go
```

### Step 4: Open Mobile App

1. **On iOS:** Open Camera app, scan QR code
2. **On Android:** Open Expo Go app, scan QR code
3. Login with your credentials
4. Navigate to **"Give Medicine Now"**
5. Select **"Dolo 650"** (or any medicine)
6. Click **"Dispense Now"**

**Expected:**
- Progress bar shows "Dispensing..."
- Success message appears
- In Blender: Disc rotates, tablet falls!

---

## 🧪 Quick Test Commands

### Dispense from C1

```bash
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001
```

Watch Blender:
- C1_Rotate_Disc rotates 40°
- C1_Tablet_01 falls
- Takes ~1.6 seconds

### Reset All Cartridges

```bash
echo '{"command":"reset"}' | nc localhost 5001
```

Watch Blender:
- All discs return to 0°
- All tablets return to pockets

### Check Status

```bash
echo '{"command":"status"}' | nc localhost 5001
```

Shows current slot position for each cartridge.

---

## 🐛 Troubleshooting

### "Python unreachable: Read timed out"

**Cause:** Socket server not running or using wrong port.

**Fix:**
1. Restart Blender
2. Run startup script
3. Restart Spring Boot backend
4. Check port 5001 is listening: `lsof -i :5001`

### "Address already in use"

**Cause:** Old socket process still running.

**Fix:**
```bash
# Kill old process
lsof -ti :5001 | xargs kill -9

# Or just restart Blender
```

### Disc rotates but no tablet falls

**Cause:** Empty slot (expected) or dispense point parented to disc.

**Check:**
1. Which slot? Slot 0 is empty by design
2. Verify dispense points are unparented:
   - Select C1_Dispense_Point in Blender
   - Check Relations panel: Parent should be "None"

### Reset doesn't restore tablets

**Cause:** Golden state file missing or corrupted.

**Fix:**
```bash
# Check file exists
cat python/tablet_positions.json

# If missing or wrong, re-save:
# In Blender console:
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/save_tablet_positions.py").read())
```

---

## 📖 Documentation

- **`TESTING_GUIDE_FINAL.md`** - Complete testing checklist (all ports updated to 5001)
- **`DISPENSE_FIX.md`** - Detailed explanation of the port change fix
- **`BLENDER_SETUP.md`** - Blender scene setup instructions

---

## 🎯 Success Checklist

Before reporting issues, verify:

- [ ] Blender is running with startup script executed
- [ ] Log shows: `[SocketServer] Listening on 127.0.0.1:5001`
- [ ] Spring Boot backend is running
- [ ] Test command works: `echo '{"command":"status"}' | nc localhost 5001`
- [ ] Backend API works: `curl http://localhost:8080/api/dispense/status`
- [ ] Mobile app shows correct backend IP in logs

✅ **All checked?** System is ready. Dispense should work!

---

## 🔄 System Architecture

```
Mobile App (React Native)
    ↓ HTTP
Spring Boot Backend (Port 8080)
    ↓ TCP Socket
Python Server (Port 5001)
    ↓ Direct API
Blender (3D Animation)
```

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| Single dispense | ~1.6s |
| Reset all | ~0.5s |
| Parallel dispense (3 carts) | ~1.6s |

---

## 🎓 Quick Commands Reference

```bash
# Start Everything (Backend + Mobile)
npm run dev

# Alternative: Start Backend Only
npm run dev:server

# Alternative: Start Mobile Only
npm run dev:mobile

# Alternative: Start Both with Concurrently (in parallel)
npm run dev:both

# Start Blender System
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())

# Test Socket
echo '{"command":"status"}' | nc localhost 5001

# Test Backend
curl http://localhost:8080/api/dispense/status

# Dispense Test
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001

# Reset Test
echo '{"command":"reset"}' | nc localhost 5001

# Monitor Logs
tail -f python/logs/dispenser_*.log
tail -f .server.log
```

---

## 🚀 You're Ready!

1. ✅ Start Blender → Run startup script
2. ✅ Run `npm run dev` (starts backend + mobile app)
3. ✅ Scan QR code with Expo Go
4. ✅ Test dispense in mobile app

**Everything should work now!** 🎉

If you encounter issues, check **`DISPENSE_FIX.md`** for detailed troubleshooting.

---

**Last Updated:** August 10, 2026 - Port changed from 5000 to 5001
