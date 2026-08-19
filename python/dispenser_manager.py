"""
dispenser_manager.py

Manages all medicine cartridge controllers and the TabletDispenser instances.

Thread-safety note
──────────────────
The socket server runs on a background thread.
bpy.app.timers.register() must only be called from Blender's main thread.

Solution: incoming requests are pushed onto a thread-safe Queue.
A lightweight Blender timer (the "dispatcher") runs on the main thread every
0.1 s and drains that queue — all bpy calls are therefore safe.

TabletDispenser integration
───────────────────────────
DispenserManager creates one TabletDispenser per cartridge.
- save_original_states() is called at startup (main thread, safe for bpy).
- Each CartridgeController receives a reference to its dispenser so it can call
  dispense() after each rotation completes.
- reset_all() / reset_cartridge() restore both disc rotation and tablet positions.
"""

import sys
import os

_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

import queue
import bpy

from cartridge_controller import CartridgeController
from tablet_drop import TabletDispenser
import config
from logger import info, separator, header

# One global queue shared between the socket thread and the Blender main thread
_command_queue: queue.Queue = queue.Queue()

DISPATCHER_INTERVAL = 0.1   # seconds between queue polls


class DispenserManager:

    def __init__(self):
        print("=" * 50)
        print("  Initializing Medicine Dispenser System")
        print("=" * 50)
        
        # ── TabletDispenser instances — one per cartridge ──────────────
        print("\n[1/3] Creating Tablet Dispensers...")
        self.tablet_dispensers: dict[str, TabletDispenser] = {}
        
        for cid, obj_name in config.CARTRIDGE_OBJECTS.items():
            dispense_point_name = f"{cid}_Dispense_Point"
            tablet_prefix = f"{cid}_Tablet_"
            
            print(f"  [TabletDispenser] Initializing {obj_name}...")
            dispenser = TabletDispenser(
                cartridge_name=obj_name,
                dispense_point_name=dispense_point_name,
                tablet_prefix=tablet_prefix,
                fall_target_name="Common_Fall_Target"
            )
            
            # Save original states for all tablets in this cartridge
            dispenser.save_original_states()
            print(f"    ✓ Saved {config.TABLETS_PER_CARTRIDGE} tablet states")
            
            self.tablet_dispensers[cid] = dispenser
        
        print("✓ Tablet Dispensers Initialized\n")

        # ── CartridgeControllers — each receives its tablet dispenser ───
        print("[2/3] Creating Cartridge Controllers...")
        self.cartridges: dict[str, CartridgeController] = {}
        
        for cid, obj_name in config.CARTRIDGE_OBJECTS.items():
            # Create controller with reference to its tablet dispenser
            controller = CartridgeController(
                object_name=obj_name,
                tablet_dispenser=self.tablet_dispensers[cid]
            )
            self.cartridges[cid] = controller
        
        print(f"✓ Dispenser Manager ready — cartridges: {list(self.cartridges)}\n")

        # Register the dispatcher timer on the main thread
        print("[3/3] Starting Command Dispatcher...")
        bpy.app.timers.register(self._dispatcher, first_interval=DISPATCHER_INTERVAL)
        print(f"✓ Dispatcher timer registered (every {DISPATCHER_INTERVAL}s)\n")

    # ------------------------------------------------------------------
    # Called by the socket server background thread — ONLY queues work
    # ------------------------------------------------------------------

    def dispense(self, cartridge_id: str, quantity: int = 1) -> bool:
        """
        Thread-safe: pushes a dispense request onto the queue.
        The actual bpy call happens in _dispatcher() on the main thread.
        """
        if cartridge_id not in self.cartridges:
            print(f"❌ Unknown cartridge: {cartridge_id!r}")
            return False

        _command_queue.put(("dispense", cartridge_id, quantity))
        print(f"[DispenserManager] Queued dispense: {cartridge_id} × {quantity}")
        return True

    def reset_all(self) -> bool:
        """
        Thread-safe: queues a full reset (all cartridges + all tablets).
        Executed on the main thread by the dispatcher.
        """
        _command_queue.put(("reset_all",))
        print("[DispenserManager] Queued reset_all")
        return True

    def reset_cartridge(self, cartridge_id: str) -> bool:
        """
        Thread-safe: queues a single-cartridge reset.
        """
        if cartridge_id not in self.cartridges:
            print(f"❌ Unknown cartridge for reset: {cartridge_id!r}")
            return False
        _command_queue.put(("reset_cartridge", cartridge_id))
        print(f"[DispenserManager] Queued reset_cartridge: {cartridge_id}")
        return True

    def is_busy(self, cartridge_id: str) -> bool:
        controller = self.cartridges.get(cartridge_id)
        return controller.running if controller else False

    def get_current_slot(self, cartridge_id: str):
        controller = self.cartridges.get(cartridge_id)
        return controller.current_slot if controller else None

    def stop_all(self):
        for controller in self.cartridges.values():
            controller.clear_queue()
        print("All cartridges stopped")

    # ------------------------------------------------------------------
    # Dispatcher — runs on Blender's main thread via bpy.app.timers
    # ------------------------------------------------------------------

    def _any_busy(self) -> bool:
        """Return True if any cartridge is currently animating."""
        return any(ctrl.running for ctrl in self.cartridges.values())

    def _dispatcher(self):
        """
        Processes one pending command per tick (0.1 s) on the main thread.

        Dispense commands are held back while any cartridge is still
        animating, so tablets are always dispensed one-by-one regardless
        of how many were requested or from how many cartridges.

        Reset commands bypass the busy check so they can interrupt and
        restore the scene at any time.
        """
        try:
            cmd = _command_queue.get_nowait()
        except queue.Empty:
            return DISPATCHER_INTERVAL  # nothing pending — sleep and retry

        action = cmd[0]

        # ── dispense ──────────────────────────────────────────────────
        if action == "dispense":
            if self._any_busy():
                # Another cartridge is still rotating/dropping — put the
                # command back at the front and wait for the next tick.
                _command_queue.put(cmd)
                return DISPATCHER_INTERVAL

            _, cartridge_id, quantity = cmd
            controller = self.cartridges.get(cartridge_id)
            if controller:
                print(f"[Dispatcher] Executing dispense: {cartridge_id} × {quantity}")
                controller.dispense(quantity)
            else:
                print(f"[Dispatcher] Unknown cartridge: {cartridge_id}")

        # ── reset_all ─────────────────────────────────────────────────
        elif action == "reset_all":
            print("[Dispatcher] Executing reset_all")
            self.stop_all()
            self._reset_disc_rotations()
            for cid, dispenser in self.tablet_dispensers.items():
                dispenser.reset_all()

        # ── reset_cartridge ───────────────────────────────────────────
        elif action == "reset_cartridge":
            _, cartridge_id = cmd
            print(f"[Dispatcher] Executing reset_cartridge: {cartridge_id}")
            ctrl = self.cartridges.get(cartridge_id)
            if ctrl:
                ctrl.clear_queue()
                self._reset_disc_rotation(cartridge_id)
            dispenser = self.tablet_dispensers.get(cartridge_id)
            if dispenser:
                dispenser.reset_all()

        else:
            print(f"[Dispatcher] Unknown action: {action!r}")

        return DISPATCHER_INTERVAL  # reschedule

    # ------------------------------------------------------------------
    # Disc rotation reset helpers (main-thread safe)
    # ------------------------------------------------------------------

    def _reset_disc_rotations(self) -> None:
        """Reset every cartridge disc back to its original Z rotation."""
        for cid in self.cartridges:
            self._reset_disc_rotation(cid)

    def _reset_disc_rotation(self, cartridge_id: str) -> None:
        """
        Reset one cartridge disc to Z = 0 and zero its slot counter.
        """
        ctrl = self.cartridges.get(cartridge_id)
        if ctrl is None:
            return

        ctrl.reset_position()
