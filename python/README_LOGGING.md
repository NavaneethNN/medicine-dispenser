# Logging System

## TL;DR

**Use this in Blender:**
```python
exec(open("/Users/navaneeth/Documents/Projects/medicine-dispenser/python/run_with_logging.py").read())
```

All output goes to: `logs/dispenser_YYYYMMDD_HHMMSS.log`

---

## Why Logging?

Blender's console doesn't always show Python output. Logging ensures:
- ✅ All output is captured
- ✅ Permanent record with timestamps
- ✅ Easy debugging
- ✅ Can monitor live

---

## Files

| File | Purpose |
|------|---------|
| `run_with_logging.py` | **Use this!** Wrapper with logging |
| `main.py` | Original entry point (no logging) |
| `logger.py` | Logger module (for future use) |
| `logs/` | Log files directory |

---

## How It Works

1. `run_with_logging.py` redirects stdout/stderr
2. All `print()` statements go to both console AND file
3. Log file created with timestamp: `dispenser_YYYYMMDD_HHMMSS.log`
4. System runs normally

---

## Log File Location

```
python/logs/dispenser_YYYYMMDD_HHMMSS.log
```

Example:
```
python/logs/dispenser_20260810_143025.log
```

---

## View Logs

### Open in Editor
```bash
open python/logs/dispenser_*.log
```

### Monitor Live
```bash
tail -f python/logs/dispenser_*.log
```

### Search Errors
```bash
grep "ERROR\|❌" python/logs/*.log
```

---

## Log Contents

- System startup messages
- Cartridge initialization
- Socket server status
- Dispense commands
- Rotation progress
- Tablet drops
- Errors and warnings
- Reset operations

---

## Cleanup

Logs are NOT auto-deleted. Clean manually:

```bash
# Delete logs older than 7 days
find python/logs -name "*.log" -mtime +7 -delete

# Keep only last 10
cd python/logs && ls -t *.log | tail -n +11 | xargs rm -f
```

---

## Full Documentation

See: [`/LOGGING_GUIDE.md`](../LOGGING_GUIDE.md)
