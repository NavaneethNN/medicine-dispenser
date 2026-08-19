"""
config.py

Central configuration for the Medicine Dispenser Digital Twin.
All tunable constants live here so nothing is scattered across files.
"""

# ── TCP Socket Server ──────────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 5001  # Changed from 5000 to avoid conflict with macOS AirPlay Receiver

# Maximum bytes to read from a single client message
RECV_BUFFER = 4096

# ── Cartridge / Disc Animation ─────────────────────────────────────────────────

# Blender object names for each cartridge disc
CARTRIDGE_OBJECTS = {
    "C1": "C1_Rotate_Disc",
    "C2": "C2_Rotate_Disc",
    "C3": "C3_Rotate_Disc",
}

# Number of slots on each disc (8 tablets + 1 empty)
SLOT_COUNT = 9

# Degrees the disc rotates per one slot advance
ANGLE_PER_SLOT = 40.0          # 360 / 9 = 40°

# Degrees moved per animation step
ROTATION_STEP = 1.0

# Seconds between each animation step (controls rotation speed)
TIMER_INTERVAL = 0.05          # 20 fps — slower, more realistic rotation

# Seconds to wait after a tablet drop before starting the next rotation.
# Covers the 60-frame fall animation (60 / 24 fps = 2.5 s) plus a small buffer.
FALL_PAUSE = 3.0

# ── Tablet Objects ─────────────────────────────────────────────────────────────

# Number of tablets per cartridge
TABLETS_PER_CARTRIDGE = 8

# Naming template: e.g. "C1_Tablet_01", "C2_Tablet_08"
# Used as: TABLET_NAME_TEMPLATE.format(cid="C1", n=1)
TABLET_NAME_TEMPLATE = "{cid}_Tablet_{n:02d}"

# Slot index (0-based) that is the EMPTY slot — no tablet lives here.
# After a reset the disc is at slot 0.  The first dispense advances to slot 1
# (the first tablet slot).  The empty slot is slot 0 by convention.
EMPTY_SLOT = 0

# Which slot index (0-based, relative to the disc's starting orientation) is
# directly over the dispense hole after N rotations.
# Because the disc starts with its empty pocket over the hole and each
# dispense rotates exactly 40° (one slot), after dispense N the disc has
# turned N × 40°.  That maps to slot index N % SLOT_COUNT.
# TabletManager uses this together with the running slot counter to determine
# whether a real tablet must be released.
DISPENSE_SLOT_OFFSET = 0       # slot 0 starts over the hole at t=0
