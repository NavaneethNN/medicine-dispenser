# Mobile App Testing Instructions

## What I Fixed

1. **Updated mobile `.env`** with correct IP address: `172.120.25.15:8080`
2. **Added `@JsonIgnore`** to Device.medicines and Medicine.schedules collections to fix 500 errors
3. **Added console logging** to API service to help debug connection issues
4. **Added connection status** display on Dashboard showing loading/error states

## How to Test

### Step 1: Stop Any Running Mobile App
If the mobile app is currently running, **stop it completely** (Ctrl+C in the terminal).

### Step 2: Clear Expo Cache and Restart
```powershell
cd mobile
npx expo start --clear
```

The `--clear` flag is **critical** - it ensures Expo picks up the new `.env` file with the updated IP address.

### Step 3: Open the App
- Press `w` for web browser, OR
- Press `a` for Android emulator, OR
- Scan QR code with Expo Go app on your phone

### Step 4: Check Connection Status
When you reach the Dashboard (home screen):
- You should see a blue "Loading data..." banner briefly
- If connection fails, you'll see a red error banner with details
- Check the browser console (F12) or Expo logs for `[API] Base URL:` message

### Step 5: Test Adding a Device
1. Click on "Devices" from the Dashboard
2. Click "+ Add" button
3. Fill in:
   - Device Name: "Kitchen Dispenser"
   - Device UID: "MD-2024-NEW"
   - Cartridges: 6
4. Click "Add Device"

**Expected Result**: Device should be created successfully without "failed to fetch" error

### Step 6: Verify Data in Backend
Open your browser and go to:
```
http://localhost:8080/api/devices
```

You should see the device you just created in the JSON response.

### Step 7: Test Full Flow
1. Add a Medicine to the device you just created
2. Add a Schedule for that medicine
3. **Close the app completely and reopen it**
4. The device, medicine, and schedule should still be there (loaded from database)

## Troubleshooting

### If you still see "failed to fetch"

**Check 1: Verify API Base URL in logs**
Look for this in Expo console:
```
[API] Base URL: http://172.120.25.15:8080
```

If it shows the old IP (`10.68.221.178`), the cache wasn't cleared. Try:
```powershell
cd mobile
rm -r node_modules/.cache
npx expo start --clear
```

**Check 2: Test backend directly**
In PowerShell:
```powershell
Invoke-RestMethod -Uri "http://172.120.25.15:8080/api/devices" -Method GET
```

If this fails, your firewall might be blocking it. Try:
```powershell
# Check if port 8080 is accessible
Test-NetConnection -ComputerName 172.120.25.15 -Port 8080
```

**Check 3: Try localhost (if testing on same machine)**
Update `mobile/.env` to:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

### If backend shows errors

Check the server logs:
```powershell
# In a new terminal
cd server
mvn spring-boot:run
```

Look for any errors when you try to add a device from the mobile app.

## Current Backend Data

Your backend currently has:
- **2 Devices**: "Test Dispenser" and "New Test Device"  
- **1 Medicine**: "Metformin 500mg" on Test Dispenser
- **1 Schedule**: Daily at 08:00 for Metformin

These should all appear in the mobile app if the connection works.

## Network Info

Your machine has two network interfaces:
- **Ethernet**: 192.168.56.1
- **Wi-Fi**: 172.120.25.15 ← **Using this one**

If you're testing on:
- **Same machine** (web browser): Use `http://localhost:8080`
- **Phone on same Wi-Fi**: Use `http://172.120.25.15:8080`
- **Android emulator**: Use `http://10.0.2.2:8080`

The mobile `.env` is currently set to `172.120.25.15` which works for phones on the same Wi-Fi network.
