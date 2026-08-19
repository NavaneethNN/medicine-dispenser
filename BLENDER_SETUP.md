# Blender Setup — Medicine Dispenser Digital Twin

This guide explains how to connect the Blender animation to the rest of the system.

---

## Prerequisites

- Blender installed (any version that ships with Python 3.10+)
- The `blender/medicinev2.blend` file
- The `python/` folder from this project

---

## Step 1 — Open the Blender file

1. Launch Blender.
2. File → Open → select `blender/medicinev2.blend`.

---

## Step 2 — Switch to the Scripting workspace

1. At the top of the Blender window, click the **Scripting** tab.  
   (If it is not visible, click the **+** icon at the end of the tab bar and choose **Scripting**.)

You will see a text editor on the left and the Python console on the right.

---

## Step 3 — Create the launcher script in Blender

Blender stores text blocks *inside* the `.blend` file. When it does, `__file__`
resolves to a fake virtual path like `.../medicinev2.blend/main.py` — which
breaks `sys.path` detection. The cleanest workaround is a tiny launcher block
that reads and executes the real file from disk.

1. In the Scripting workspace text editor, click **New** to create a blank block.
2. Paste **exactly** these two lines:

```python
import os, sys
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/main.py").read())
```

3. Do **not** use File → Open — that still stores the file internally and hits
   the same `__file__` problem.

> If you already have a `main.py` text block from a previous attempt, click
> the **X** next to its name in the dropdown to unlink it first, then create
> a fresh block with the launcher above.

---

## Step 4 — Run the script

1. With the launcher in the text editor, press **Alt + P**  
   — or click the **▶ Run Script** button in the text editor header.
2. The script returns **immediately** — Blender stays fully responsive.

To see `print()` output, launch Blender from a terminal:

```bash
/Applications/Blender.app/Contents/MacOS/Blender
```

You should see:

```
[main] sys.path includes: .../python
✓ DispenserManager ready — cartridges: ['C1', 'C2', 'C3']
✓ Socket Server Initialized
[SocketServer] Listening on 127.0.0.1:5000 (background thread)

System Ready — Blender UI is fully responsive.
Waiting for dispense commands on port 5000...
```

> **Why Blender was freezing before**  
> The socket server's `accept()` loop is a blocking infinite loop. Running it
> on Blender's main thread locked up the entire UI. It now runs on a daemon
> background thread — Blender stays interactive and the disc rotation timers
> still fire normally on the main thread.

---

## Step 5 — Verify the objects are named correctly

The script expects three disc objects in the scene:

| Cartridge | Expected Blender object name |
|-----------|------------------------------|
| C1        | `C1_Rotate_Disc`             |
| C2        | `C2_Rotate_Disc`             |
| C3        | `C3_Rotate_Disc`             |

To check:
1. Press **A** in the 3D viewport to select all.
2. Open the **Outliner** (top-right panel) and confirm the three names exist.

If the names differ, update `CARTRIDGE_OBJECTS` in `python/config.py` to match.

---

## Step 6 — Start the Spring Boot server

In a separate terminal:

```bash
cd server
./mvnw spring-boot:run
```

The server starts on port `8080` and the scheduler begins checking schedules every minute.

---

## Step 7 — Start the mobile app

In another terminal:

```bash
cd mobile
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or press **i** for iOS simulator / **a** for Android emulator.

---

## How the full flow works

```
Mobile App
  │  tap "Dispense Now"  (or schedule fires automatically)
  ▼
POST /api/dispense  →  Spring Boot (port 8080)
  │  resolves cartridge ID + quantity from the schedule
  ▼
TCP JSON  →  Python socket server (port 5000)  ←  running inside Blender
  │  { "command": "dispense", "cartridge": "C1", "quantity": 1 }
  ▼
CartridgeController  →  bpy.app.timers  →  rotates C1_Rotate_Disc by 40°
```

Automatic dispensing works the same way — the Spring Boot scheduler fires at the exact HH:MM stored in each schedule instead of waiting for a manual tap.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'dispenser_manager'` and path shows `.blend/main.py` | Blender is running a cached internal copy of the script, not the one on disk. Delete the existing text block and create a fresh one containing only the two-line launcher from Step 3. |
| `KeyError: 'C1_Rotate_Disc'` | The disc object name in Blender doesn't match. Check the Outliner and update `config.py`. |
| `Connection refused` on port 5000 | The script is not running inside Blender yet, or it crashed. Check the system console. |
| Blender freezes / stops responding after running the script | The socket server was running on the main thread. This is fixed — it now runs in a background daemon thread and `start()` returns immediately. Make sure you have the latest `socket_server.py`. |
| Port 5000 already in use | Another process is using port 5000. Change `PORT` in `python/config.py` and update `dispenser.python.port` in `server/src/main/resources/application.yml` to match. |
