"""
startup.py

Safe startup script that:
1. Resets disc rotations to 0°
2. Starts the system with logging
3. Handles port conflicts gracefully

Usage in Blender:
    exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/startup.py").read())

Note: If you get "Address already in use" error, restart Blender to clear the old socket.
"""

import sys
import os
import bpy
import math

# Add python directory to path
python_dir = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python"
if python_dir not in sys.path:
    sys.path.insert(0, python_dir)

print("=" * 70)
print("  Medicine Dispenser - Safe Startup")
print("=" * 70)
print("")

# ── Step 1: Reset disc rotations ───────────────────────────────────────────────
print("[1/2] Resetting disc rotations to 0°...")

disc_names = ["C1_Rotate_Disc", "C2_Rotate_Disc", "C3_Rotate_Disc"]
reset_count = 0

for disc_name in disc_names:
    obj = bpy.data.objects.get(disc_name)
    if obj:
        current_deg = math.degrees(obj.rotation_euler.z)
        obj.rotation_euler.z = 0.0
        print(f"  ✓ {disc_name}: {current_deg:.1f}° → 0.0°")
        reset_count += 1
    else:
        print(f"  ⚠  {disc_name} not found in scene")

if reset_count > 0:
    bpy.context.view_layer.update()
    print(f"  ✓ Reset {reset_count} discs to home position")
else:
    print("  ⚠  No discs found to reset")

print("")

# ── Step 2: Start system with logging ──────────────────────────────────────────
print("[2/2] Starting system with logging...")
print("")
print("💡 If you see 'Address already in use' error below,")
print("   restart Blender to clear the old socket server.")
print("")

# Now run the logging wrapper
exec(open(os.path.join(python_dir, "run_with_logging.py")).read())
