"""
save_tablet_positions.py

ONE-TIME SETUP: Run this script to save the current tablet and disc positions
as the "golden state" that the system will always reset to.

Usage in Blender (after manually positioning all tablets correctly):
    exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/save_tablet_positions.py").read())

This creates: python/tablet_positions.json

The saved positions include:
- All tablet world transforms (location, rotation, scale)
- All tablet parent relationships
- All disc rotations
- Verification that empty pocket aligns with dispense hole at 0°
"""

import bpy
import json
import math
import os
from mathutils import Matrix

# Hardcoded python directory
PYTHON_DIR = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python"
POSITIONS_FILE = os.path.join(PYTHON_DIR, "tablet_positions.json")

# Configuration
CARTRIDGE_IDS = ["C1", "C2", "C3"]
TABLETS_PER_CARTRIDGE = 8


def save_positions():
    """Save current tablet and disc positions to JSON file."""
    
    print("=" * 70)
    print("  SAVE TABLET POSITIONS - Creating Golden State")
    print("=" * 70)
    print("")
    
    positions_data = {
        "version": "1.0",
        "description": "Golden state tablet positions - manually verified correct alignment",
        "discs": {},
        "tablets": {},
        "metadata": {
            "empty_pocket_at_zero": True,
            "slot_count": 9,
            "tablets_per_cartridge": TABLETS_PER_CARTRIDGE
        }
    }
    
    # ── Step 1: Save disc rotations ────────────────────────────────────
    print("[1/3] Saving disc rotations...")
    
    for cid in CARTRIDGE_IDS:
        disc_name = f"{cid}_Rotate_Disc"
        disc = bpy.data.objects.get(disc_name)
        
        if disc:
            rotation_deg = math.degrees(disc.rotation_euler.z)
            positions_data["discs"][cid] = {
                "object_name": disc_name,
                "rotation_z_degrees": rotation_deg,
                "rotation_z_radians": disc.rotation_euler.z
            }
            print(f"  ✓ {disc_name}: {rotation_deg:.2f}°")
        else:
            print(f"  ⚠  {disc_name} not found!")
    
    print("")
    
    # ── Step 2: Save tablet positions ──────────────────────────────────
    print("[2/3] Saving tablet positions...")
    
    saved_count = 0
    missing_count = 0
    
    for cid in CARTRIDGE_IDS:
        positions_data["tablets"][cid] = {}
        
        for n in range(1, TABLETS_PER_CARTRIDGE + 1):
            tablet_name = f"{cid}_Tablet_{n:02d}"
            tablet = bpy.data.objects.get(tablet_name)
            
            if not tablet:
                print(f"  ⚠  {tablet_name} not found!")
                missing_count += 1
                continue
            
            # Save complete transform data
            matrix_world = tablet.matrix_world
            
            tablet_data = {
                "object_name": tablet_name,
                
                # World transform as 4x4 matrix (flattened)
                "matrix_world": [
                    [matrix_world[0][0], matrix_world[0][1], matrix_world[0][2], matrix_world[0][3]],
                    [matrix_world[1][0], matrix_world[1][1], matrix_world[1][2], matrix_world[1][3]],
                    [matrix_world[2][0], matrix_world[2][1], matrix_world[2][2], matrix_world[2][3]],
                    [matrix_world[3][0], matrix_world[3][1], matrix_world[3][2], matrix_world[3][3]]
                ],
                
                # Local transform
                "location": list(tablet.location),
                "rotation_euler": list(tablet.rotation_euler),
                "rotation_mode": tablet.rotation_mode,
                "scale": list(tablet.scale),
                
                # Parent info
                "parent_name": tablet.parent.name if tablet.parent else None,
                "parent_type": tablet.parent_type,
                "matrix_parent_inverse": [
                    [tablet.matrix_parent_inverse[0][0], tablet.matrix_parent_inverse[0][1], 
                     tablet.matrix_parent_inverse[0][2], tablet.matrix_parent_inverse[0][3]],
                    [tablet.matrix_parent_inverse[1][0], tablet.matrix_parent_inverse[1][1], 
                     tablet.matrix_parent_inverse[1][2], tablet.matrix_parent_inverse[1][3]],
                    [tablet.matrix_parent_inverse[2][0], tablet.matrix_parent_inverse[2][1], 
                     tablet.matrix_parent_inverse[2][2], tablet.matrix_parent_inverse[2][3]],
                    [tablet.matrix_parent_inverse[3][0], tablet.matrix_parent_inverse[3][1], 
                     tablet.matrix_parent_inverse[3][2], tablet.matrix_parent_inverse[3][3]]
                ]
            }
            
            positions_data["tablets"][cid][f"tablet_{n:02d}"] = tablet_data
            saved_count += 1
        
        print(f"  ✓ {cid}: Saved {TABLETS_PER_CARTRIDGE} tablets")
    
    print("")
    print(f"  Total tablets saved: {saved_count}/{TABLETS_PER_CARTRIDGE * len(CARTRIDGE_IDS)}")
    
    if missing_count > 0:
        print(f"  ⚠  Missing tablets: {missing_count}")
    
    print("")
    
    # ── Step 3: Verify alignment ───────────────────────────────────────
    print("[3/3] Verifying alignment...")
    
    all_verified = True
    
    for cid in CARTRIDGE_IDS:
        disc_name = f"{cid}_Rotate_Disc"
        dispense_point_name = f"{cid}_Dispense_Point"
        
        disc = bpy.data.objects.get(disc_name)
        dispense_point = bpy.data.objects.get(dispense_point_name)
        
        if not disc or not dispense_point:
            print(f"  ⚠  {cid}: Missing disc or dispense point")
            all_verified = False
            continue
        
        # Check disc is at 0°
        rotation_deg = math.degrees(disc.rotation_euler.z)
        
        if abs(rotation_deg) < 0.1:  # Within 0.1 degree of zero
            print(f"  ✓ {cid}: Disc at 0.0° (empty pocket aligned with hole)")
        else:
            print(f"  ⚠  {cid}: Disc at {rotation_deg:.2f}° (should be 0.0°)")
            all_verified = False
        
        # Check dispense point is NOT parented to disc
        if dispense_point.parent is None:
            print(f"  ✓ {cid}: Dispense point is stationary (not parented)")
        else:
            print(f"  ⚠  {cid}: Dispense point is parented to {dispense_point.parent.name}")
            all_verified = False
    
    print("")
    
    # ── Step 4: Save to file ───────────────────────────────────────────
    print("[4/4] Saving to file...")
    
    try:
        with open(POSITIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(positions_data, f, indent=2)
        
        print(f"  ✓ Saved to: {POSITIONS_FILE}")
        print(f"  File size: {os.path.getsize(POSITIONS_FILE)} bytes")
    except Exception as e:
        print(f"  ❌ Error saving file: {e}")
        return False
    
    print("")
    
    # ── Summary ────────────────────────────────────────────────────────
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    
    if all_verified and missing_count == 0:
        print("  ✅ SUCCESS: Golden state saved!")
        print("")
        print("  What was saved:")
        print(f"    • {len(positions_data['discs'])} disc rotations")
        print(f"    • {saved_count} tablet positions")
        print(f"    • All parent relationships")
        print(f"    • All world transforms")
        print("")
        print("  Next steps:")
        print("    1. This file is now the 'golden state'")
        print("    2. Reset operations will restore to these positions")
        print("    3. Your manual alignment is preserved forever")
        print("")
        print("  To test:")
        print("    Run: exec(open('.../python/startup.py').read())")
    else:
        print("  ⚠  WARNING: Some issues detected")
        print("")
        print("  Issues:")
        if missing_count > 0:
            print(f"    • {missing_count} tablets missing from scene")
        if not all_verified:
            print(f"    • Some discs not at 0° or dispense points parented")
        print("")
        print("  The file was still saved, but you may want to:")
        print("    1. Fix the issues mentioned above")
        print("    2. Run this script again to update")
    
    print("=" * 70)
    print("")
    
    return all_verified and missing_count == 0


# Run the save operation
success = save_positions()

if success:
    print("✅ Golden state saved successfully!")
else:
    print("⚠️  Golden state saved with warnings - check output above")
