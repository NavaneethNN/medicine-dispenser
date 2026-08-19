"""
logger.py

Centralized logging system that writes to both console and a file.
All print() statements should be replaced with log() calls.

The log file is created in the same directory as the script with a timestamp.
"""

import os
import sys
from datetime import datetime


class Logger:
    """
    Simple logger that writes to both console and file.
    Automatically creates a log file on first use.
    """
    
    def __init__(self):
        self.log_file = None
        self.log_path = None
        self._initialize_log_file()
    
    def _initialize_log_file(self):
        """Create log file with timestamp in filename."""
        # Get the directory where the script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Create logs directory if it doesn't exist
        logs_dir = os.path.join(script_dir, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"dispenser_{timestamp}.log"
        self.log_path = os.path.join(logs_dir, filename)
        
        # Open log file
        try:
            self.log_file = open(self.log_path, "w", encoding="utf-8", buffering=1)
            self._write_header()
        except Exception as e:
            print(f"[Logger] Failed to create log file: {e}")
            self.log_file = None
    
    def _write_header(self):
        """Write header to log file."""
        if self.log_file:
            header = [
                "=" * 70,
                "  Medicine Dispenser System Log",
                "=" * 70,
                f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                f"  Log file: {self.log_path}",
                "=" * 70,
                ""
            ]
            for line in header:
                self.log_file.write(line + "\n")
    
    def log(self, message, level="INFO"):
        """
        Log a message to both console and file.
        
        Parameters:
            message (str): The message to log
            level (str): Log level (INFO, WARNING, ERROR, DEBUG)
        """
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]  # milliseconds
        formatted = f"[{timestamp}] [{level}] {message}"
        
        # Write to console
        print(formatted)
        sys.stdout.flush()
        
        # Write to file
        if self.log_file:
            try:
                self.log_file.write(formatted + "\n")
                self.log_file.flush()  # Force write to disk
            except Exception as e:
                print(f"[Logger] Failed to write to log file: {e}")
    
    def info(self, message):
        """Log an info message."""
        self.log(message, "INFO")
    
    def warning(self, message):
        """Log a warning message."""
        self.log(message, "WARNING")
    
    def error(self, message):
        """Log an error message."""
        self.log(message, "ERROR")
    
    def debug(self, message):
        """Log a debug message."""
        self.log(message, "DEBUG")
    
    def separator(self, char="=", length=70):
        """Log a separator line."""
        self.info(char * length)
    
    def header(self, text, char="="):
        """Log a header with separator lines."""
        self.separator(char)
        self.info(f"  {text}")
        self.separator(char)
    
    def close(self):
        """Close the log file."""
        if self.log_file:
            self.info("=" * 70)
            self.info("  Log closed")
            self.info("=" * 70)
            self.log_file.close()
            self.log_file = None


# Global logger instance
_logger = None


def get_logger():
    """Get or create the global logger instance."""
    global _logger
    if _logger is None:
        _logger = Logger()
    return _logger


def log(message, level="INFO"):
    """Convenience function for logging."""
    get_logger().log(message, level)


def info(message):
    """Log info message."""
    get_logger().info(message)


def warning(message):
    """Log warning message."""
    get_logger().warning(message)


def error(message):
    """Log error message."""
    get_logger().error(message)


def debug(message):
    """Log debug message."""
    get_logger().debug(message)


def separator(char="=", length=70):
    """Log separator."""
    get_logger().separator(char, length)


def header(text, char="="):
    """Log header."""
    get_logger().header(text, char)


def close_log():
    """Close log file."""
    global _logger
    if _logger:
        _logger.close()
        _logger = None


def get_log_path():
    """Get the path to the current log file."""
    logger = get_logger()
    return logger.log_path if logger else None
