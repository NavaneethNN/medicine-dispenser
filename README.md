# Medicine Dispenser - Complete System

Full-stack medicine dispensing system with Blender digital twin, mobile app, and backend API.

## 🚀 Quick Start - Complete System

### 1. One-Time Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

**Save Golden State (Blender - First Time Only):**
```python
# In Blender Scripting tab:
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/save_tablet_positions.py").read())
```

### 2. Daily Development

**Step 1: Start Blender Digital Twin**
```python
# In Blender Scripting tab:
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())
```
Expected: `[SocketServer] Listening on 127.0.0.1:5001`

**Step 2: Start Backend + Mobile App (One Command!)**
```bash
npm run dev
```
This auto-starts:
- ✅ Spring Boot backend (port 8080)
- ✅ Expo mobile app with QR code
- ✅ Auto-detects LAN IP for mobile connectivity

**Step 3: Test Dispense**
- Scan QR code with Expo Go
- Login → "Give Medicine Now"
- Select medicine → Click "Dispense Now"
- Watch Blender: Disc rotates, tablet falls! 🎉

### 3. Quick Test Commands

```bash
# Test socket server
echo '{"command":"status"}' | nc localhost 5001

# Test backend API
curl http://localhost:8080/api/dispense/status

# Test dispense
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001
```

---

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** - Quick start guide ⭐ NEW USERS START HERE
- **[TESTING_GUIDE_FINAL.md](TESTING_GUIDE_FINAL.md)** - Complete testing checklist
- **[DISPENSE_FIX.md](DISPENSE_FIX.md)** - Port 5001 fix (macOS AirPlay conflict)
- **[BLENDER_SETUP.md](BLENDER_SETUP.md)** - Blender scene setup reference

---

## 🏗️ System Architecture

### Blender Digital Twin

- **Animation-based** tablet drops (no physics simulation)
- **Automatic tablet detection** by angle (no hardcoding)
- **Golden state** preservation (manually-verified positions)
- **Thread-safe** command queue
- **TCP socket** interface on port 5001 (changed from 5000 to avoid macOS AirPlay)

### Mobile App (React Native + Expo)

- Manual dispense interface
- Schedule management
- Device control
- Real-time status

### Backend (Spring Boot + PostgreSQL)

- REST API
- User management
- Schedule processing
- Database persistence

---

## 📦 Project Structure

```
medicine-dispenser/
├── blender/                 # Blender .blend files
├── mobile/                  # React Native mobile app
│   ├── src/screens/
│   └── src/services/
├── server/                  # Spring Boot backend
│   └── src/main/java/
├── prisma/                  # Database schema
├── python/                  # Blender Python scripts ⭐
│   ├── startup.py              # Start script (use this!)
│   ├── save_tablet_positions.py # Golden state creator
│   ├── tablet_positions.json   # Golden state (tracked in git)
│   ├── main.py                 # Entry point
│   ├── config.py               # Configuration
│   ├── socket_server.py        # Network interface
│   ├── dispenser_manager.py    # Orchestrator
│   ├── cartridge_controller.py # Disc rotation
│   └── tablet_drop.py          # Tablet animation
└── README.md                # This file
```

---

## 🔧 Setup & Development

### Quick Start (Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Start Blender digital twin (see above)

# 3. Start everything
npm run dev
```

### Individual Commands

```bash
npm run dev          # Backend + Mobile (auto LAN IP detection)
npm run dev:server   # Backend only
npm run dev:mobile   # Mobile only
npm run dev:both     # Both in parallel (concurrently)
```

---

## 🎮 Commands Reference

### Blender Digital Twin (Port 5001)

```bash
# Dispense tablet
echo '{"command":"dispense","cartridge":"C1","quantity":1}' | nc localhost 5001

# Check status
echo '{"command":"status"}' | nc localhost 5001

# Reset all
echo '{"command":"reset"}' | nc localhost 5001

# Reset single cartridge
echo '{"command":"reset_cartridge","cartridge":"C1"}' | nc localhost 5001
```

### Development

```bash
# Start everything
npm run dev

# View logs
tail -f .server.log                    # Backend logs
tail -f python/logs/dispenser_*.log    # Blender logs
```

---

## 🔌 Integration

### From Java Backend

```java
String json = "{\"command\":\"dispense\",\"cartridge\":\"C1\",\"quantity\":1}";
Socket socket = new Socket("127.0.0.1", 5001);
OutputStream out = socket.getOutputStream();
out.write((json + "\n").getBytes());
```

### From React Native

```javascript
// Mobile app calls backend API, not socket directly
const response = await fetch('http://192.168.1.x:8080/api/dispense', {
  method: 'POST',
  body: JSON.stringify({
    cartridgeId: 'C1',
    quantity: 1
  })
});
```

---

## 📋 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgresql://user:pass@host/dbname
JWT_SECRET=your-secret-key
```

---

## 🧪 Testing

See **[TESTING_GUIDE_FINAL.md](TESTING_GUIDE_FINAL.md)** for:
- Complete test checklist
- Expected behaviors
- Troubleshooting
- Performance benchmarks
- Integration testing

---

## 📊 Key Features

### Blender Digital Twin
- ✅ 3 independent cartridges
- ✅ 8 tablets per cartridge
- ✅ Animation-based dispensing
- ✅ Automatic empty slot detection
- ✅ Golden state preservation
- ✅ Complete reset capability

### Mobile App
- ✅ Manual dispense control
- ✅ Schedule management
- ✅ Device monitoring
- ✅ Real-time status

### Backend
- ✅ RESTful API
- ✅ User authentication
- ✅ Schedule processing
- ✅ PostgreSQL database

---

## 🔍 Logs

View live Blender logs:

```bash
tail -f python/logs/dispenser_*.log
```

Search for errors:

```bash
grep "ERROR\|❌" python/logs/*.log
```

---

## 🐛 Troubleshooting

### "Python unreachable: Read timed out"

**Cause:** Socket server not running or using wrong port

**Solution:**
1. Restart Blender
2. Run startup script
3. Restart backend: `npm run dev`
4. Verify: `lsof -i :5001`

See **[DISPENSE_FIX.md](DISPENSE_FIX.md)** for details.

### Blender: "Address already in use"

**Solution:** Restart Blender completely

**Alternative:**
```bash
lsof -ti:5001 | xargs kill -9
```

### Mobile: Can't connect to backend

1. Check backend is running: `curl http://localhost:8080/api/dispense/status`
2. Verify mobile and computer on same WiFi
3. Check firewall settings
4. Verify LAN IP in mobile/.env

### Backend: Database connection failed

1. Verify DATABASE_URL in `.env`
2. Check Neon database is accessible
3. Verify credentials

---

## 📖 Requirements

- **Blender:** 3.0+
- **Python:** 3.9+ (bundled with Blender)
- **Node.js:** 16+
- **Java:** 17+
- **Database:** PostgreSQL (Neon)

---

## 🎯 Next Steps

1. **Read START_HERE.md** - Complete quick start guide
2. **Setup Blender Digital Twin** - Run startup script
3. **Run `npm run dev`** - Starts backend + mobile app automatically
4. **Scan QR code** - Open mobile app on device
5. **Test dispense** - Click "Dispense Now" button

---

## ⚡ Quick Reference

**Start Command:** `npm run dev`  
**Socket Port:** 5001 (changed from 5000)  
**Backend Port:** 8080  
**Mobile:** Auto-connects via LAN IP

**System Ready When:**
- ✅ Blender shows: `[SocketServer] Listening on 127.0.0.1:5001`
- ✅ Terminal shows: `Backend is up!`
- ✅ Expo shows QR code
- ✅ Mobile app connects successfully

---

## 📄 License

MIT

---

## 🤝 Support

For issues or questions:
1. Check TESTING_GUIDE_FINAL.md
2. Review log files
3. Check Blender console for errors

**System ready for production! 🚀**
