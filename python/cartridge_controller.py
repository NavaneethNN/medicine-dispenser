"""
cartridge_controller.py

Controls one medicine cartridge disc in Blender.

All methods in this class are called exclusively from the main thread
(via DispenserManager._dispatcher), so bpy calls are always safe.

TabletDispenser integration
───────────────────────────
After each 40° rotation completes, _finish() calls
tablet_dispenser.dispense() which automatically detects the aligned tablet
and animates it falling.  The tablet_dispenser reference is optional — if
None the controller works in disc-only mode.
"""

import sys
import os

_this_dir = os.path.dirname(os.path.abspath(__file__))
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)

import bpy
import math
from collections import deque
from typing import Optional

import config


class CartridgeController:

    def __init__(self, object_name: str, tablet_dispenser=None):
        """
        Parameters
        ──────────
        object_name      : Blender object name of the rotating disc,
                           e.g. "C1_Rotate_Disc".
        tablet_dispenser : Optional TabletDispenser instance.  When provided,
                           dispense() is called after every rotation so the
                           aligned tablet falls automatically.
        """
        self.obj              = bpy.data.objects[object_name]
        self.cid              = object_name.split("_")[0]   # "C1", "C2", "C3"
        self.current_slot     = 0
        self.current_angle    = 0.0  # Current absolute angle in degrees
        self.target_angle     = 0.0  # Target absolute angle in degrees
        self.running          = False
        self._timer_active    = False  # True while a _update timer is registered
        self.queue: deque     = deque()

        # Optional reference — injected by DispenserManager after creation
        self._tablet_dispenser = tablet_dispenser

        # Initialize to current rotation
        self.current_angle = math.degrees(self.obj.rotation_euler.z)
        self.target_angle = self.current_angle

        print(f"  ↳ CartridgeController: {object_name} "
              f"({config.SLOT_COUNT} slots, "
              f"tablet_dispenser={'yes' if tablet_dispenser else 'no'}, "
              f"initial angle: {self.current_angle:.1f}°)")

    # ------------------------------------------------------------------
    # Called from main thread via dispatcher
    # ------------------------------------------------------------------

    def dispense(self, quantity: int = 1):
        """Queue `quantity` disc rotations and start the animation if idle."""
        for _ in range(quantity):
            self.queue.append(1)  # Just count dispenses

        print(f"[{self.obj.name}] +{quantity} rotation(s) queued "
              f"(total pending: {len(self.queue)}, running: {self.running})")

        if not self.running:
            self._start_next()

    # ------------------------------------------------------------------
    # Animation loop — all on main thread via bpy.app.timers
    # ------------------------------------------------------------------

    def _start_next(self):
        if not self.queue:
            self.running = False
            print(f"[{self.obj.name}] Queue empty — idle")
            return

        self.running = True
        self.queue.popleft()
        
        # Move to next slot
        self.current_slot = (self.current_slot + 1) % config.SLOT_COUNT
        
        # Calculate target angle (absolute position)
        # Rotate clockwise (negative Z in Blender)
        self.target_angle = self.current_angle - config.ANGLE_PER_SLOT

        print(f"[{self.obj.name}] Starting rotation → slot {self.current_slot} "
              f"({self.current_angle:.1f}° → {self.target_angle:.1f}°)")

        # Guard: never register a second _update timer while one is still live.
        # Without this, _finish() → _start_next() would register a new timer
        # before Blender has fully unregistered the one that just returned None,
        # leaving two timers spinning the disc simultaneously (continuous rotation).
        if not self._timer_active:
            self._timer_active = True
            bpy.app.timers.register(self._update, first_interval=config.TIMER_INTERVAL)

    def _update(self):
        """
        Called by Blender's timer. Rotates the disc by one step towards target.
        Returns the next interval to keep the timer alive, or None to stop.
        """
        # Calculate remaining angle to target
        remaining = abs(self.target_angle - self.current_angle)
        
        if remaining < 0.1:  # Close enough - snap to target (increased threshold)
            self.current_angle = self.target_angle
            self.obj.rotation_euler.z = math.radians(self.current_angle)
            bpy.context.view_layer.update()
            print(f"[{self.obj.name}] ✓ Reached slot {self.current_slot} at {self.current_angle:.1f}°")
            # Clear the timer guard BEFORE calling _finish so that _start_next
            # is allowed to register the next timer for the following rotation.
            self._timer_active = False
            self._finish()
            return None  # Unregister timer
        
        # Take a step towards target
        step = min(config.ROTATION_STEP, remaining)
        
        # Move in the correct direction
        if self.target_angle < self.current_angle:
            self.current_angle -= step
        else:
            self.current_angle += step
        
        self.obj.rotation_euler.z = math.radians(self.current_angle)

        # Force viewport refresh so the rotation is visible
        bpy.context.view_layer.update()

        return config.TIMER_INTERVAL  # Keep going

    def _finish(self):
        """
        Called once each rotation reaches exactly 40°.

        1. Calls TabletDispenser.dispense() which automatically detects
           and animates the aligned tablet falling.
        2. Waits FALL_PAUSE seconds so the drop animation plays before
           the next rotation begins.
        3. Starts the next queued rotation (if any).
        """
        # ── Tablet drop animation ─────────────────────────────────────
        released = False
        if self._tablet_dispenser is not None:
            try:
                released = self._tablet_dispenser.dispense()
                if released:
                    print(f"[{self.obj.name}] 💊 Tablet dispensed successfully")
                else:
                    print(f"[{self.obj.name}] ○  No tablet at this position (empty slot or already dispensed)")
            except Exception as exc:
                print(f"[{self.obj.name}] ⚠  TabletDispenser.dispense() error: {exc}")
        else:
            print(f"[{self.obj.name}] (no tablet_dispenser — skipping tablet drop)")

        # ── Pause then chain to next rotation ────────────────────────
        # Give the fall animation time to play before the disc moves again.
        # FALL_PAUSE is long enough to cover the keyframe fall (30 frames
        # at ~24 fps ≈ 1.25 s) plus a small visual buffer.
        self.running = False
        pause = config.FALL_PAUSE if released else 0.1
        bpy.app.timers.register(self._start_next, first_interval=pause)

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def set_tablet_dispenser(self, tablet_dispenser) -> None:
        """Inject (or replace) the tablet dispenser after construction."""
        self._tablet_dispenser = tablet_dispenser
        print(f"[{self.obj.name}] tablet_dispenser {'set' if tablet_dispenser else 'cleared'}")

    def is_busy(self) -> bool:
        return self.running

    def get_slot(self) -> int:
        return self.current_slot

    def clear_queue(self) -> None:
        self.queue.clear()
        self.running = False
        self._timer_active = False

    def reset_position(self) -> None:
        """Reset disc to home position (0° rotation)."""
        self.current_slot = 0
        self.current_angle = 0.0
        self.target_angle = 0.0
        self.obj.rotation_euler.z = 0.0
        bpy.context.view_layer.update()
        print(f"[{self.obj.name}] Position reset → 0° (slot 0)")
