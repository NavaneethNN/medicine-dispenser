"""
run_with_logging.py

Wrapper script that redirects all output to a log file.

Usage in Blender:
    exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/run_with_logging.py").read())

This will:
1. Create a log file in python/logs/
2. Redirect all print() output to the log file
3. Also print to console
4. Run the main medicine dispenser system
5. Show the log file location
"""

import sys
import os
from datetime import datetime


class TeeOutput:
    """Writes to both file and original stdout/stderr."""
    
    def __init__(self, file_obj, original):
        self.file = file_obj
        self.original = original
    
    def write(self, message):
        # Write to file
        if self.file and not self.file.closed:
            try:
                self.file.write(message)
                self.file.flush()
            except Exception:
                pass
        
        # Write to original (console)
        if self.original:
            try:
                self.original.write(message)
                self.original.flush()
            except Exception:
                pass
    
    def flush(self):
        if self.file and not self.file.closed:
            try:
                self.file.flush()
            except Exception:
                pass
        if self.original:
            try:
                self.original.flush()
            except Exception:
                pass


def setup_logging():
    """Set up file logging."""
    # When running from Blender via exec(), __file__ points to the .blend file
    # Use hardcoded python directory instead
    python_dir = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python"
    
    # Create logs directory
    logs_dir = os.path.join(python_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    # Create log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"dispenser_{timestamp}.log"
    log_path = os.path.join(logs_dir, log_filename)
    
    # Open log file
    try:
        log_file = open(log_path, "w", encoding="utf-8", buffering=1)
        
        # Write header to log file
        header = [
            "=" * 70,
            "  Medicine Dispenser System Log",
            "=" * 70,
            f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"  Log file: {log_path}",
            "=" * 70,
            ""
        ]
        for line in header:
            log_file.write(line + "\n")
        log_file.flush()
        
        # Redirect stdout and stderr to both file and console
        original_stdout = sys.stdout
        original_stderr = sys.stderr
        
        sys.stdout = TeeOutput(log_file, original_stdout)
        sys.stderr = TeeOutput(log_file, original_stderr)
        
        # Print to both console and file
        print(f"📝 Log file created: {log_path}")
        print(f"💡 View live: tail -f {log_path}")
        print("")
        
        return log_path, log_file
        
    except Exception as e:
        print(f"❌ Failed to create log file: {e}")
        return None, None


def main():
    """Main entry point with logging."""
    # Set up logging first
    log_path, log_file = setup_logging()
    
    # Add python directory to path
    python_dir = "/Users/navaneeth/Documents/Projects/medicine-dispenser/python"
    if python_dir not in sys.path:
        sys.path.insert(0, python_dir)
    
    # Import and run the main system
    try:
        print("=" * 70)
        print("  Starting Medicine Dispenser System")
        print("=" * 70)
        print("")
        
        from dispenser_manager import DispenserManager
        from socket_server import SocketServer
        import config
        
        manager = DispenserManager()
        print("✓ Dispenser Manager Initialized")
        print("")
        
        server = SocketServer(manager)
        print("✓ Socket Server Initialized")
        print("")
        
        server.start()
        
        print("=" * 70)
        print("  System Ready — Blender UI is fully responsive.")
        print("=" * 70)
        print("")
        print(f"Waiting for dispense commands on port {config.PORT}...")
        print("")
        
        if log_path:
            print(f"📝 All output is being logged to:")
            print(f"   {log_path}")
            print("")
            print(f"💡 Monitor live with: tail -f {log_path}")
            print("")
        
        print("=" * 70)
        print("")
        
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        import traceback
        traceback.print_exc()
        
        if log_file and not log_file.closed:
            print("", file=log_file)
            print("=" * 70, file=log_file)
            print("  ERROR LOG", file=log_file)
            print("=" * 70, file=log_file)
            traceback.print_exc(file=log_file)
            log_file.flush()


# Run the system
main()
