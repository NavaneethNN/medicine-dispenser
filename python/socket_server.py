"""
socket_server.py

TCP Socket Server for the Medicine Dispenser Digital Twin.
Runs in a daemon background thread so Blender's main thread stays responsive.

Supported commands
──────────────────
Dispense tablets:
  { "command": "dispense", "cartridge": "C1", "quantity": 2 }

Query current slot positions:
  { "command": "status" }

Reset all cartridges and tablets:
  { "command": "reset" }

Reset a single cartridge and its tablets:
  { "command": "reset_cartridge", "cartridge": "C1" }
"""

import sys
import os

_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

import socket
import json
import threading

import config


class SocketServer:

    def __init__(self, dispenser_manager):
        self.manager = dispenser_manager
        self._thread = None

    # ------------------------------------------------------------------
    # Start the server in a background daemon thread
    # ------------------------------------------------------------------

    def start(self):
        """
        Launches the TCP accept loop in a daemon thread.
        Returns immediately so Blender's main thread is never blocked.
        The thread dies automatically when Blender exits.
        """
        self._thread = threading.Thread(
            target=self._run,
            name="SocketServerThread",
            daemon=True          # killed automatically when Blender exits
        )
        self._thread.start()
        print(f"[SocketServer] Listening on {config.HOST}:{config.PORT} (background thread)")

    # ------------------------------------------------------------------
    # Accept loop — runs on the background thread
    # ------------------------------------------------------------------

    def _run(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        try:
            server.bind((config.HOST, config.PORT))
        except OSError as e:
            if e.errno == 48:  # Address already in use
                print(f"[SocketServer] ❌ ERROR: Port {config.PORT} is already in use!")
                print(f"[SocketServer] This usually means:")
                print(f"[SocketServer]   1. You ran the script twice without restarting Blender")
                print(f"[SocketServer]   2. Another program is using port {config.PORT}")
                print(f"[SocketServer]")
                print(f"[SocketServer] 💡 SOLUTION: Restart Blender to clear the old socket")
                print(f"[SocketServer]")
                return
            else:
                print(f"[SocketServer] ❌ Bind error: {e}")
                return
        
        server.listen(5)

        while True:
            try:
                client, address = server.accept()
                print(f"[SocketServer] Client connected: {address}")
                # Handle each connection in its own thread so slow clients
                # don't block the next accept
                threading.Thread(
                    target=self._handle,
                    args=(client,),
                    daemon=True
                ).start()
            except Exception as e:
                print(f"[SocketServer] Accept error: {e}")

    # ------------------------------------------------------------------
    # Per-connection handler
    # ------------------------------------------------------------------

    def _handle(self, client: socket.socket):
        try:
            # Read exactly one newline-terminated line.
            # Java's PythonSocketClient sends  println(json)  which appends \n,
            # then immediately calls readLine() — it never closes the write side.
            # The old read-until-EOF loop therefore deadlocked: Python waited for
            # the socket to close; Java waited for a response. Fix: use makefile()
            # readline() which returns as soon as it sees the \n, matching Java's
            # protocol exactly.
            rfile = client.makefile("r", encoding="utf-8")
            data = rfile.readline()

            if not data.strip():
                client.send(json.dumps({
                    "status": "error",
                    "message": "Empty request"
                }).encode())
                return

            print(f"[SocketServer] Received: {data}")

            request  = json.loads(data)
            response = self._process(request)

            client.send(json.dumps(response).encode())

        except json.JSONDecodeError as e:
            client.send(json.dumps({
                "status": "error",
                "message": f"Invalid JSON: {e}"
            }).encode())

        except Exception as e:
            print(f"[SocketServer] Handler error: {e}")
            try:
                client.send(json.dumps({
                    "status": "error",
                    "message": str(e)
                }).encode())
            except Exception:
                pass

        finally:
            client.close()

    # ------------------------------------------------------------------
    # Command dispatcher
    # ------------------------------------------------------------------

    def _process(self, request: dict) -> dict:

        command = request.get("command")

        # ── dispense ────────────────────────────────────────────────────
        if command == "dispense":

            cartridge = request.get("cartridge", "").upper()
            quantity  = int(request.get("quantity", 1))

            if quantity < 1:
                return {"status": "error", "message": "quantity must be >= 1"}

            # CartridgeController uses bpy.app.timers which must be
            # scheduled from the main thread — call_soon is not available,
            # but bpy.app.timers.register IS thread-safe in Blender 3+
            success = self.manager.dispense(cartridge, quantity)

            if success:
                return {
                    "status":  "success",
                    "message": f"{cartridge} dispensing {quantity} tablet(s)"
                }

            return {
                "status":  "error",
                "message": f"Invalid cartridge: {cartridge}"
            }

        # ── status ──────────────────────────────────────────────────────
        if command == "status":
            result = {"status": "success"}
            for cid in self.manager.cartridges:
                result[cid] = {
                    "slot": self.manager.get_current_slot(cid),
                    "busy": self.manager.is_busy(cid),
                }
            return result

        # ── reset (all cartridges + all tablets) ─────────────────────
        if command == "reset":
            self.manager.reset_all()
            return {
                "status":  "success",
                "message": "Reset queued — all cartridges and tablets will be restored"
            }

        # ── reset_cartridge (single cartridge + its tablets) ─────────
        if command == "reset_cartridge":
            cartridge = request.get("cartridge", "").upper()
            if not cartridge:
                return {"status": "error", "message": "missing 'cartridge' field"}
            success = self.manager.reset_cartridge(cartridge)
            if success:
                return {
                    "status":  "success",
                    "message": f"Reset queued for cartridge {cartridge}"
                }
            return {
                "status":  "error",
                "message": f"Invalid cartridge: {cartridge}"
            }

        # ── unknown ─────────────────────────────────────────────────────
        return {
            "status":  "error",
            "message": f"Unknown command: {command!r}"
        }
