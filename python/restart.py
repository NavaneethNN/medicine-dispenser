"""
restart.py

Hot-restart the medicine dispenser system without closing Blender.

Run this in Blender's Script Editor whenever you want to reload code changes:

    exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/restart.py").read())

What it does:
  1. Unregisters all active bpy.app.timers registered by this system
  2. Closes the old socket server (releases port 5001)
  3. Purges all cached module imports so fresh code is loaded from disk
  4. Re-runs startup.py (resets discs to 0° and starts everything fresh)
"""

import sys
import socket as _socket
import bpy

python_dir = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python"

print("=" * 60)
print("  Medicine Dispenser — Hot Restart")
print("=" * 60)

# ── Step 1: Unregister all system timers ──────────────────────────
print("\n[1/3] Stopping timers...")

# Collect timer functions belonging to our modules
_system_modules = {
    "cartridge_controller",
    "dispenser_manager",
    "tablet_drop",
    "socket_server",
}

# bpy.app.timers has no list API, but we can reach registered timers
# by inspecting the internal list via __timers if available, otherwise
# we cancel known function references stored on the global manager.
cancelled = 0
try:
    # Try to grab the live manager and cancel its dispatcher
    import dispenser_manager as _dm
    if hasattr(_dm, '_command_queue'):
        # Drain the queue so no stale commands fire after restart
        import queue as _q
        while not _dm._command_queue.empty():
            try:
                _dm._command_queue.get_nowait()
            except _q.Empty:
                break

    # Cancel cartridge _update timers by clearing their running flags
    # (the timer will return None on next tick and unregister itself)
    if hasattr(_dm, 'DispenserManager'):
        # Walk all live instances via gc
        import gc
        for obj in gc.get_objects():
            if isinstance(obj, _dm.DispenserManager):
                for ctrl in obj.cartridges.values():
                    ctrl.running = False
                    ctrl._timer_active = False
                    ctrl.queue.clear()
                cancelled += 1
                print(f"  ✓ Stopped DispenserManager (cartridges cleared)")
except Exception as e:
    print(f"  ⚠  Timer cleanup: {e}")

print(f"  ✓ Timers stopped")

# ── Step 2: Release the socket port ───────────────────────────────
print("\n[2/3] Releasing port 5001...")

try:
    import config as _cfg
    port = _cfg.PORT
except Exception:
    port = 5001

# Connect to our own server and send a shutdown probe — the server
# is a daemon thread so it can't be stopped directly.  Instead we
# create a throwaway socket that connects to the port and immediately
# closes it, then rely on module reload to spin up a fresh server.
# The key is that SO_REUSEADDR is already set on the server socket,
# so the new bind after module reload will succeed even while the old
# daemon thread is still technically alive (it will die when Blender
# exits or when it tries to accept on a closed server socket).
#
# We force-close the old server socket by patching it to None so the
# accept loop gets an exception and exits cleanly.
try:
    import socket_server as _ss
    import gc
    for obj in gc.get_objects():
        if isinstance(obj, _ss.SocketServer):
            # Close the underlying server socket so _run()'s accept() raises
            # and the thread exits on its own.
            try:
                obj._server_socket.close()
                print("  ✓ Old server socket closed")
            except Exception:
                pass
except Exception as e:
    print(f"  ⚠  Socket close: {e}")

print(f"  ✓ Port {port} will be released on module reload")

# ── Step 3: Purge cached modules ──────────────────────────────────
print("\n[3/3] Reloading modules from disk...")

_modules_to_purge = [
    "config",
    "logger",
    "tablet_drop",
    "cartridge_controller",
    "dispenser_manager",
    "socket_server",
]

for mod_name in _modules_to_purge:
    if mod_name in sys.modules:
        del sys.modules[mod_name]
        print(f"  ✓ Purged: {mod_name}")

# Small delay so the old daemon thread's accept loop has time to exit
# after the socket close above before we try to bind the same port.
import time
time.sleep(0.5)

# ── Step 4: Run startup ───────────────────────────────────────────
print("\n  Launching startup.py...\n")
import os
exec(open(os.path.join(python_dir, "startup.py")).read())
