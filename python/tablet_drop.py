import bpy
import math
import json
import os
from mathutils import Matrix


class TabletDispenser:

    ALIGNMENT_TOLERANCE = 8.0
    FALL_FRAMES = 60
    
    # Path to saved positions file
    POSITIONS_FILE = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python/tablet_positions.json"

    def __init__(
        self,
        cartridge_name,
        dispense_point_name,
        tablet_prefix,
        fall_target_name="Common_Fall_Target"
    ):
        self.cartridge_name = cartridge_name
        self.dispense_point_name = dispense_point_name
        self.tablet_prefix = tablet_prefix
        self.fall_target_name = fall_target_name
        
        # Extract cartridge ID (C1, C2, C3)
        self.cartridge_id = cartridge_name.split("_")[0]

        self.disc = bpy.data.objects.get(cartridge_name)
        self.dispense_point = bpy.data.objects.get(dispense_point_name)
        self.fall_target = bpy.data.objects.get(fall_target_name)

        if self.disc is None:
            raise ValueError(
                f"Cartridge not found: {cartridge_name}"
            )

        if self.dispense_point is None:
            raise ValueError(
                f"Dispense point not found: {dispense_point_name}"
            )

        if self.fall_target is None:
            raise ValueError(
                f"Fall target not found: {fall_target_name}"
            )

    # ========================================================
    # SAVE ORIGINAL TABLET STATES (from JSON file)
    # ========================================================

    def save_original_states(self):
        """
        Load original tablet states from the saved positions JSON file.
        This file is created once by running save_tablet_positions.py
        after manually positioning all tablets correctly.
        """
        
        # Check if positions file exists
        if not os.path.exists(self.POSITIONS_FILE):
            print(f"  ⚠  WARNING: {self.POSITIONS_FILE} not found!")
            print(f"  ⚠  Run save_tablet_positions.py first to create golden state")
            print(f"  ⚠  Falling back to runtime snapshot...")
            self._save_runtime_states()
            return
        
        # Load positions from file
        try:
            with open(self.POSITIONS_FILE, 'r', encoding='utf-8') as f:
                positions_data = json.load(f)
            
            print(f"  ✓ Loaded golden state from {os.path.basename(self.POSITIONS_FILE)}")
            
            # Get tablets for this cartridge
            cartridge_tablets = positions_data["tablets"].get(self.cartridge_id, {})
            
            if not cartridge_tablets:
                print(f"  ⚠  No tablets found for {self.cartridge_id} in file")
                self._save_runtime_states()
                return
            
            # Load each tablet's saved state
            loaded_count = 0
            for i in range(1, 9):
                tablet_key = f"tablet_{i:02d}"
                tablet_name = f"{self.tablet_prefix}{i:02d}"
                
                tablet = bpy.data.objects.get(tablet_name)
                if tablet is None:
                    continue
                
                if tablet_key not in cartridge_tablets:
                    print(f"    ⚠  {tablet_name} not in saved positions")
                    continue
                
                saved_data = cartridge_tablets[tablet_key]
                
                # Reconstruct matrix_world from saved data
                matrix_list = saved_data["matrix_world"]
                original_matrix = Matrix([
                    matrix_list[0],
                    matrix_list[1],
                    matrix_list[2],
                    matrix_list[3]
                ])
                
                # Reconstruct matrix_parent_inverse
                inv_list = saved_data["matrix_parent_inverse"]
                parent_inverse = Matrix([
                    inv_list[0],
                    inv_list[1],
                    inv_list[2],
                    inv_list[3]
                ])
                
                # Store as custom properties
                tablet["original_matrix"] = [
                    value
                    for row in original_matrix
                    for value in row
                ]
                
                tablet["original_parent"] = saved_data.get("parent_name", "")
                
                tablet["original_parent_inverse"] = [
                    value
                    for row in parent_inverse
                    for value in row
                ]
                
                tablet["original_location"] = saved_data["location"]
                tablet["original_rotation_euler"] = saved_data["rotation_euler"]
                tablet["original_rotation_mode"] = saved_data["rotation_mode"]
                tablet["original_scale"] = saved_data["scale"]
                
                tablet["dispensed"] = False
                
                loaded_count += 1
            
            print(f"    ✓ Loaded {loaded_count} tablets from golden state")
            
        except Exception as e:
            print(f"  ❌ Error loading positions file: {e}")
            print(f"  ⚠  Falling back to runtime snapshot...")
            self._save_runtime_states()
    
    def _save_runtime_states(self):
        """Fallback: Save current runtime positions (old behavior)."""
        for i in range(1, 9):
            name = f"{self.tablet_prefix}{i:02d}"
            tablet = bpy.data.objects.get(name)

            if tablet is None:
                continue

            matrix = tablet.matrix_world.copy()

            tablet["original_matrix"] = [
                value
                for row in matrix
                for value in row
            ]

            tablet["original_parent"] = (
                tablet.parent.name
                if tablet.parent
                else ""
            )

            tablet["original_parent_inverse"] = [
                value
                for row in tablet.matrix_parent_inverse
                for value in row
            ]

            tablet["dispensed"] = False

    # ========================================================
    # FIND ALIGNED TABLET
    # ========================================================

    def find_aligned_tablet(self):

        disc_center = self.disc.matrix_world.translation

        outlet_position = (
            self.dispense_point.matrix_world.translation
        )

        outlet_vector = outlet_position - disc_center

        outlet_angle = math.degrees(
            math.atan2(
                outlet_vector.y,
                outlet_vector.x
            )
        ) % 360.0

        best_tablet = None
        best_difference = float("inf")

        for i in range(1, 9):

            name = f"{self.tablet_prefix}{i:02d}"

            tablet = bpy.data.objects.get(name)

            if tablet is None:
                continue

            # Ignore already dispensed tablets
            if tablet.get("dispensed", False):
                continue

            tablet_position = (
                tablet.matrix_world.translation
            )

            tablet_vector = tablet_position - disc_center

            tablet_angle = math.degrees(
                math.atan2(
                    tablet_vector.y,
                    tablet_vector.x
                )
            ) % 360.0

            difference = abs(
                outlet_angle - tablet_angle
            )

            if difference > 180.0:
                difference = 360.0 - difference

            if difference < best_difference:

                best_difference = difference
                best_tablet = tablet

        if best_tablet is None:
            return None

        if best_difference > self.ALIGNMENT_TOLERANCE:
            return None

        return best_tablet

    # ========================================================
    # DISPENSE
    # ========================================================

    def dispense(self):

        tablet = self.find_aligned_tablet()

        if tablet is None:
            print(
                f"[{self.cartridge_name}] "
                "No tablet aligned with outlet."
            )
            return False

        if tablet.get("dispensed", False):
            print(
                f"[{tablet.name}] Already dispensed."
            )
            return False

        print(
            f"[{self.cartridge_name}] "
            f"Dispensing {tablet.name}"
        )

        # ----------------------------------------------------
        # Preserve exact world transform
        # ----------------------------------------------------

        world_matrix = tablet.matrix_world.copy()

        # ----------------------------------------------------
        # Detach from rotating cartridge
        # ----------------------------------------------------

        tablet.parent = None

        tablet.matrix_world = world_matrix

        bpy.context.view_layer.update()

        # ----------------------------------------------------
        # Remove any previous animation
        # ----------------------------------------------------

        if tablet.animation_data:
            tablet.animation_data_clear()

        # ----------------------------------------------------
        # Fall animation
        # ----------------------------------------------------

        scene = bpy.context.scene

        start_frame = scene.frame_current
        end_frame = start_frame + self.FALL_FRAMES

        start_location = tablet.location.copy()

        target_location = (
            self.fall_target.matrix_world.translation.copy()
        )

        tablet.location = start_location

        tablet.keyframe_insert(
            data_path="location",
            frame=start_frame
        )

        tablet.location = target_location

        tablet.keyframe_insert(
            data_path="location",
            frame=end_frame
        )

        # ----------------------------------------------------
        # Mark tablet as dispensed
        # ----------------------------------------------------

        tablet["dispensed"] = True

        print(
            f"[{tablet.name}] "
            f"Fall animation created."
        )

        return True

    # ========================================================
    # RESET ONE TABLET
    # ========================================================

    def reset_tablet(self, tablet_name):

        tablet = bpy.data.objects.get(tablet_name)

        if tablet is None:
            print(
                f"Tablet not found: {tablet_name}"
            )
            return False

        if "original_matrix" not in tablet:
            print(
                f"No original state saved for "
                f"{tablet_name}"
            )
            return False

        # ----------------------------------------------------
        # Reconstruct original matrix
        # ----------------------------------------------------

        values = tablet["original_matrix"]

        original_matrix = Matrix([
            values[0:4],
            values[4:8],
            values[8:12],
            values[12:16]
        ])

        # ----------------------------------------------------
        # Original parent
        # ----------------------------------------------------

        parent_name = tablet.get(
            "original_parent",
            ""
        )

        original_parent = None

        if parent_name:
            original_parent = bpy.data.objects.get(
                parent_name
            )

        # ----------------------------------------------------
        # Remove fall animation
        # ----------------------------------------------------

        if tablet.animation_data:
            tablet.animation_data_clear()

        # ----------------------------------------------------
        # Restore parent
        # ----------------------------------------------------

        tablet.parent = original_parent

        bpy.context.view_layer.update()

        # ----------------------------------------------------
        # Restore matrix_parent_inverse
        # When re-parenting, Blender recomputes matrix_parent_inverse
        # from the current transforms, which corrupts local-space
        # positioning. We must explicitly restore the saved value
        # BEFORE restoring the world matrix so the local transform
        # is derived correctly.
        # ----------------------------------------------------

        inv_values = tablet.get("original_parent_inverse", None)
        if inv_values and original_parent is not None:
            tablet.matrix_parent_inverse = Matrix([
                inv_values[0:4],
                inv_values[4:8],
                inv_values[8:12],
                inv_values[12:16]
            ])

        # ----------------------------------------------------
        # Restore exact original world transform
        # ----------------------------------------------------

        tablet.matrix_world = original_matrix

        bpy.context.view_layer.update()

        # ----------------------------------------------------
        # Mark available again
        # ----------------------------------------------------

        tablet["dispensed"] = False

        print(
            f"[{tablet_name}] "
            "Reset successfully."
        )

        return True

    # ========================================================
    # RESET ALL TABLETS IN THIS CARTRIDGE
    # ========================================================

    def reset_all(self):

        count = 0

        for i in range(1, 9):

            tablet_name = (
                f"{self.tablet_prefix}{i:02d}"
            )

            if self.reset_tablet(tablet_name):
                count += 1

        print(
            f"[{self.cartridge_name}] "
            f"Reset {count} tablets."
        )

        return count