# Troubleshooting Mobile App Connection

## Common "Failed to fetch" Error Solutions

### 1. **Check if Backend is Running**
```powershell
# Check if port 8080 is listening
netstat -an | Select-String "8080"

# Should show:
# TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING
```

If not running, start the Spring Boot server:
```powershell
cd server
mvn spring-boot:run
```

---

### 2. **Verify Your Computer's IP Address**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object IPAddress
```

Your current WiFi IP is: **172.120.25.15**

---

### 3. **Update Mobile App Configuration**

Edit `mobile/.env`:
```env
# For PHYSICAL DEVICE on SAME WiFi network:
EXPO_PUBLIC_API_BASE_URL=http://172.120.25.15:8080

# For ANDROID EMULATOR:
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080

# For iOS SIMULATOR:
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

**Important:** After changing `.env`, **restart Expo**:
```powershell
cd mobile
# Press Ctrl+C to stop current server
npx expo start --clear
```

---

### 4. **Test Backend from Computer**
```powershell
# Test on localhost
Invoke-WebRequest -Uri "http://localhost:8080/api/devices" -Method GET -UseBasicParsing

# Test on WiFi IP (this is what your phone will use)
Invoke-WebRequest -Uri "http://172.120.25.15:8080/api/devices" -Method GET -UseBasicParsing
```

Both should return `StatusCode: 200`

---

### 5. **Windows Firewall Configuration**

The backend must be accessible through Windows Firewall. Check if port 8080 is allowed:

```powershell
# Check firewall rules for port 8080
netsh advfirewall firewall show rule name=all | Select-String -Pattern "8080" -Context 2,2
```

If no rule exists, add one:
```powershell
# Allow inbound connections on port 8080
netsh advfirewall firewall add rule name="Spring Boot Server" dir=in action=allow protocol=TCP localport=8080
```

---

### 6. **Ensure Backend Binds to All Interfaces**

Verify `server/src/main/resources/application.yml` has:
```yaml
server:
  port: 8080
  address: 0.0.0.0  # This allows external connections
```

After changing, restart the backend.

---

### 7. **Device Must Be on Same WiFi Network**

Your phone/tablet **MUST** be connected to the **SAME WiFi network** as your computer.

Check:
- Phone WiFi: Should be connected to same router
- Computer WiFi: 172.120.25.15 (current)

---

### 8. **Test from Mobile Device Browser**

Before running the app, test in your phone's browser:
```
http://172.120.25.15:8080/api/devices
```

You should see JSON response with devices list.

---

### 9. **Clear Expo Cache and Restart**

Sometimes Expo caches old configuration:
```powershell
cd mobile
npx expo start --clear
```

Then press:
- `a` for Android
- `i` for iOS
- Or scan QR code with Expo Go app

---

### 10. **Check for CORS Issues**

The backend CORS is configured to allow all origins. Verify in `SecurityConfig.java`:
```java
config.setAllowedOriginPatterns(List.of("*"));
config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
```

---

## Quick Diagnostic Checklist

- [ ] Backend is running (`netstat -an | Select-String "8080"`)
- [ ] Backend accessible on localhost (`curl http://localhost:8080/api/devices`)
- [ ] Backend accessible on WiFi IP (`curl http://172.120.25.15:8080/api/devices`)
- [ ] Firewall allows port 8080
- [ ] `application.yml` has `address: 0.0.0.0`
- [ ] Mobile device on same WiFi network
- [ ] `mobile/.env` has correct IP address
- [ ] Expo server restarted with `--clear` flag
- [ ] Can access backend from phone browser

---

## Still Not Working?

### Check Database Connection
```powershell
# From server directory
cd server
mvn spring-boot:run
```

Look for this in logs:
```
✓ HikariPool-1 - Start completed.
✓ Started BackendApplication
```

If you see database connection errors, check:
1. `.env` file has correct `SPRING_DATASOURCE_URL`
2. Neon database is accessible (not paused/deleted)
3. Database credentials are valid

---

## Alternative: Use ngrok for Testing

If firewall/network issues persist, use ngrok:
```powershell
# Install ngrok from https://ngrok.com/
ngrok http 8080
```

Then use the ngrok URL in `mobile/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-random-id.ngrok-free.app
```
