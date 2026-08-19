"""
main.py

Application entry point for the Medicine Dispenser Digital Twin.
Run this from Blender's Scripting tab via the two-line launcher:

    import os, sys
    exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/main.py").read())

The socket server starts in a background daemon thread so Blender stays
fully responsive after the script finishes.

All output is logged to: python/logs/dispenser_YYYYMMDD_HHMMSS.log
"""

import sys
import os

# ── Path bootstrap ─────────────────────────────────────────────────────────────
# exec() sets __file__ to the caller's __file__ (the .blend virtual path).
# So we always use the hardcoded absolute path as the reliable fallback.
_PYTHON_DIR = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python"

if _PYTHON_DIR not in sys.path:
    sys.path.insert(0, _PYTHON_DIR)

# ── Initialize logger FIRST ────────────────────────────────────────────────────
from logger import get_logger, header, info, get_log_path

logger = get_logger()
info(f"sys.path includes: {_PYTHON_DIR}")

# ── Imports (after path is set) ────────────────────────────────────────────────
from dispenser_manager import DispenserManager
from socket_server import SocketServer


def main():
    header("Medicine Dispenser Digital Twin")
    
    # Show log file location immediately
    log_path = get_log_path()
    info(f"📝 Log file: {log_path}")
    info("")

    manager = DispenserManager()
    info("✓ Dispenser Manager Initialized")
    info("")

    server = SocketServer(manager)
    info("✓ Socket Server Initialized")
    info("")

    # start() launches the TCP loop in a background thread and returns
    # immediately — Blender stays responsive
    server.start()

    info("System Ready — Blender UI is fully responsive.")
    info("Waiting for dispense commands on port 5001...")
    info("")
    info(f"💡 View live log: tail -f {log_path}")
    info("")


# Called whether run via "Run Script" button or via exec()
main()
