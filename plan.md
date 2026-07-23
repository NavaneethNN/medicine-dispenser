# Smart Medicine Dispenser - Project Plan

## Project Overview

The Smart Medicine Dispenser is an IoT-based automated medicine dispensing system that allows caregivers to remotely configure medicines, schedules, and monitor the device. The dispenser automatically releases medicines at scheduled times.

> **Version 1 Scope**
>
> This version focuses only on caregiver management and device configuration.
> AI-based tablet verification will be implemented in a future version.

---

# Technology Stack

## Mobile Application

- React Native
- Expo
- React Navigation
- Axios

## Backend

- Spring Boot
- Spring Security
- JWT Authentication
- Spring Data JPA

## Database

- Neon PostgreSQL

## Hardware

- Raspberry Pi
- Servo Motors
- Camera (Future)
- 3D Printed Medicine Dispenser

---

# User Roles

## Caregiver

Currently, the application supports only one role.

The caregiver can:

- Create an account
- Register devices
- Configure medicine containers
- Create medicine schedules
- Monitor device status
- View dispensing history
- Receive notifications

---

# Application Modules

## 1. Authentication

Features

- Login
- Register
- Forgot Password
- Logout

---

## 2. Dashboard

Displays

- Connected Device
- Device Status
- Next Dispensing Time
- Total Medicines
- Today's Scheduled Medicines
- Remaining Stock Summary

---

## 3. Device Management

Features

- Add Device
- Pair Device
- Rename Device
- Remove Device
- Device Status
- Device Information

Device Information

- Device Name
- Device ID
- Firmware Version
- Last Sync
- Online Status

---

## 4. Medicine Library

Store reusable medicine information.

Fields

- Medicine Name
- Description
- Tablet Size
- Shape
- Color
- Notes

---

## 5. Container Configuration

Configure which medicine is loaded into each container.

Each container contains

- Container Number
- Assigned Medicine
- Current Stock
- Maximum Capacity
- Low Stock Threshold
- Expiry Date

---

## 6. Schedule Management

Create automatic dispensing schedules.

Fields

- Medicine
- Quantity
- Dispensing Time
- Frequency
- Start Date
- End Date
- Before Food / After Food

Supported Frequencies

- Daily
- Alternate Days
- Weekly
- Custom Days

---

## 7. Stock Management

Track remaining tablets.

Features

- Current Stock
- Refill Stock
- Low Stock Alert
- Refill History

---

## 8. Dispensing History

Store all dispensing activities.

Information

- Date
- Time
- Medicine
- Quantity
- Status
- Remarks

---

## 9. Notifications

Examples

- Device Connected
- Device Offline
- Medicine Dispensed
- Low Stock
- Schedule Updated
- Refill Required

---

## 10. Settings

Features

- Change Password
- Notification Settings
- Device Settings
- Logout

---

# Backend Modules

```
Authentication
Users
Devices
Medicines
Containers
Schedules
Stock
Dispensing
Notifications
```

---

# Database Tables

## users

```
id
name
email
password
created_at
```

---

## devices

```
id
device_name
device_uid
firmware_version
status
last_sync
user_id
created_at
```

---

## medicines

```
id
name
description
tablet_size
shape
color
notes
created_at
```

---

## containers

```
id
device_id
container_number
medicine_id
current_stock
maximum_capacity
low_stock_threshold
expiry_date
updated_at
```

---

## schedules

```
id
device_id
medicine_id
quantity
dispense_time
frequency
days
start_date
end_date
before_food
status
created_at
```

---

## dispensing_history

```
id
device_id
medicine_id
quantity
dispensed_at
status
remarks
```

---

## notifications

```
id
user_id
title
message
type
is_read
created_at
```

---

# REST API Modules

## Authentication

```
POST /auth/register
POST /auth/login
POST /auth/forgot-password
```

---

## Devices

```
GET /devices
POST /devices
PUT /devices/{id}
DELETE /devices/{id}
```

---

## Medicines

```
GET /medicines
POST /medicines
PUT /medicines/{id}
DELETE /medicines/{id}
```

---

## Containers

```
GET /containers
PUT /containers/{id}
POST /containers/refill
```

---

## Schedules

```
GET /schedules
POST /schedules
PUT /schedules/{id}
DELETE /schedules/{id}
```

---

## History

```
GET /history
```

---

## Notifications

```
GET /notifications
PUT /notifications/read
```

---

# Mobile Application Pages

```
Splash Screen

Login

Register

Dashboard

Devices

Add Device

Medicine Library

Container Configuration

Schedules

Add Schedule

Stock Management

Dispensing History

Notifications

Settings
```

---

# Project Folder Structure

## React Native

```
src/
│
├── components/
├── screens/
├── navigation/
├── services/
├── hooks/
├── context/
├── utils/
├── assets/
└── App.tsx
```

---

## Spring Boot

```
src/main/java/

controller/

service/

repository/

entity/

dto/

config/

security/

exception/

util/
```

---

# Future Enhancements

- AI-based tablet verification
- Camera integration
- Caregiver notifications after dispensing
- Patient mobile application
- Voice reminders
- QR code device pairing
- Cloud backup
- Multiple device management
- Analytics dashboard

---

# Development Roadmap

## Phase 1

- Authentication
- Dashboard
- Device Management

---

## Phase 2

- Medicine Library
- Container Configuration
- Stock Management

---

## Phase 3

- Schedule Management
- Automatic Dispensing Integration

---

## Phase 4

- Dispensing History
- Notifications
- Settings

---

## Phase 5

- Testing
- Bug Fixes
- Hardware Integration
- Deployment

---

# Project Goal

Develop a reliable and user-friendly smart medicine dispenser that enables caregivers to remotely configure medicines, manage dispensing schedules, monitor stock levels, and automate medicine dispensing through an IoT-enabled device.