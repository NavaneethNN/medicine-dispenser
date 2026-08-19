# Dispense Button Fix - "Python unreachable: Read timed out"

## 🐛 Problem

When clicking "Dispense Now" in the mobile app, nothing happens. Error message shows:

```
Dolo 650
Python unreachable: Read timed out
```

## 🔍 Root Cause

The Python socket server in Blender was trying to use **port 5000**, but this port is occupied by **macOS AirPlay Receiver** (ControlCenter process). This caused:

1. Socket server failed to start with error: `OSError: [Errno 48] Address already in use`
2. Mobile app → Spring Boot backend → tried to connect to port 5000
3. Connection timed out because no server was listening
4. Error message: "Python unreachable: Read timed out"

## ✅ Solution

**Changed socket server port from 5000 → 5001** to avoid conflict with macOS system services.

### Files Modified

1. **`python/config.py`**
   - Changed `PORT = 5000` to `PORT = 5001`
   - Added comment about macOS AirPlay conflict

2. **`server/src/main/resources/application.yml`**
   - Changed `port: ${PYTHON_SOCKET_PORT:5000}` to `port: ${PYTHON_SOCKET_PORT:5001}`
   - Added comment about macOS AirPlay conflict

3. **`TESTING_GUIDE_FINAL.md`**
   - Updated all test commands to use port 5001
   - Updated expected output to show port 5001
   - Added warning about port change

## 🚀 How to Fix

### Step 1: Restart Blender

Close and reopen Blender to clear any old socket connections.

### Step 2: Run Startup Script

In Blender Python Console (bottom panel, "Scripting" workspace):

```python
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())
```

**Expected Output:**
```
[SocketServer] Listening on 127.0.0.1:5001
```

✅ **If you see port 5001, you're good!**

❌ **If you see "Address already in use", restart Blender and try again**

### Step 3: Restart Spring Boot Backend

The backend needs to connect to the new port 5001:

```bash
cd /Users/navaneeth/Documents/Projects/medicine-dispenser/server
./mvnw spring-boot:run
```

Wait for:
```
Started BackendApplication in X.XXX seconds
```

### Step 4: Test from Terminal

```bash
echo '{"command":"status"}' | nc localhost 5001
```

**Expected Response:**
```json
{
  "status": "success",
  "C1": {"slot": 0, "busy": false},
  "C2": {"slot": 0, "busy": false},
  "C3": {"slot": 0, "busy": false}
}
```

✅ **If you see this, the socket server is working!**

### Step 5: Test Mobile App Dispense

1. Open mobile app (make sure it's connected to your backend server)
2. Navigate to **"Give Medicine Now"** screen
3. Select **"Dolo 650"** (or any medicine)
4. Click **"Dispense Now"**

**Expected:**
- Progress bar shows "Dispensing 1 / 1 tablets"
- Success message: "1 tablet dispensed ✓"
- In Blender: Disc rotates, tablet falls

## 🧪 Test Dispense Command

Test the complete flow:

```bash
# Test 1: Check socket server is running
echo '{"command":"status"}' | nc localhost 5001

# Test 2: Dispense one tablet from C1
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001

# Expected in Blender:
# - C1_Rotate_Disc rotates 40°
# - C1_Tablet_01 falls
# - Takes ~1.6 seconds

# Test 3: Reset all cartridges
echo '{"command":"reset"}' | nc localhost 5001

# Expected in Blender:
# - All discs return to 0°
# - All tablets return to pockets
```

## 🐛 Troubleshooting

### Issue: "Connection refused"

**Symptom:** `nc: connectfailed: Connection refused`

**Solution:**
1. Blender is not running, or
2. Startup script not executed, or
3. Socket server crashed

**Fix:**
```bash
# Check if port 5001 is listening
lsof -i :5001

# If nothing, run startup script in Blender
```

---

### Issue: "Address already in use"

**Symptom:** `OSError: [Errno 48] Address already in use`

**Solution:**
1. Old Blender process still running
2. Run startup script twice without restarting

**Fix:**
```bash
# Option 1: Restart Blender (recommended)

# Option 2: Kill the port (if Blender is stuck)
lsof -ti :5001 | xargs kill -9
```

---

### Issue: Backend still uses port 5000

**Symptom:** Backend logs show `[PythonSocket] → Connection refused` or `timeout`

**Solution:** Backend not restarted after config change

**Fix:**
```bash
# Stop backend (Ctrl+C)
# Restart backend
cd server
./mvnw spring-boot:run
```

---

### Issue: Mobile app still shows timeout

**Symptom:** App shows "Python unreachable: Read timed out" even after fix

**Checklist:**
- [ ] Blender running with startup script executed?
- [ ] Socket server showing port 5001 in logs?
- [ ] Backend restarted after config change?
- [ ] Backend can reach `localhost:5001`?
- [ ] Mobile app connected to correct backend IP?

**Test each layer:**
```bash
# Layer 1: Python socket (Blender)
echo '{"command":"status"}' | nc localhost 5001

# Layer 2: Backend → Python socket
curl http://localhost:8080/api/dispense/status

# Layer 3: Mobile app → Backend
# Check mobile app logs and network inspector
```

---

## 📝 Verification Checklist

Before testing mobile app:

- [ ] Blender is open
- [ ] Startup script executed: `exec(open(...).read())`
- [ ] Log shows: `[SocketServer] Listening on 127.0.0.1:5001`
- [ ] Spring Boot backend is running
- [ ] Backend logs show: `Started BackendApplication`
- [ ] Test command works: `echo '{"command":"status"}' | nc localhost 5001`
- [ ] Backend API works: `curl http://localhost:8080/api/dispense/status`
- [ ] Mobile app connected to backend (check API_BASE in app logs)

✅ **All green? Mobile app dispense should work!**

---

## 🎯 Summary

| Before | After |
|--------|-------|
| Port 5000 (conflicts with macOS) | Port 5001 (free) |
| Socket server crashes | Socket server starts successfully |
| "Python unreachable: Read timed out" | Dispense works correctly |

**Key Changes:**
- `python/config.py`: `PORT = 5001`
- `server/.../application.yml`: `port: 5001`
- All test commands updated to use 5001

**Next Steps:**
1. Restart Blender → Run startup script
2. Restart Spring Boot backend
3. Test mobile app dispense button
4. Should work! 🎉

---

## 📖 Reference

**Test Commands (Port 5001):**
```bash
# Status
echo '{"command":"status"}' | nc localhost 5001

# Dispense
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001

# Reset
echo '{"command":"reset"}' | nc localhost 5001
```

**Startup Command:**
```python
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())
```

**Backend Start:**
```bash
cd server && ./mvnw spring-boot:run
```

**Mobile App Expected Flow:**
```
Mobile App → Spring Boot (8080) → Python Socket (5001) → Blender
```

---

✅ **Problem solved! Dispense button should work now.** 🚀
