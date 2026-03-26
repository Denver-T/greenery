# ✅ Greenery Platform — Manual QA Checklist

This document covers manual test plans for the three primary user flows:
**Login**, **PTO (Book Time Off)**, and **Work Requests**.

---

## 🔐 1. Login Flow

### Prerequisites
- API running at `http://localhost:3001`
- Docker/MySQL running
- Firebase project configured
- User account exists in both Firebase Auth and `accounts` table

---

### Test Cases

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| L1 | Valid login | Enter correct email + password → tap Login | Navigates to HomePage | |
| L2 | Wrong password | Enter correct email + wrong password → tap Login | Shows error message | |
| L3 | Empty email | Leave email blank → tap Login | Shows validation error | |
| L4 | Empty password | Leave password blank → tap Login | Shows validation error | |
| L5 | Non-existent email | Enter email not in Firebase → tap Login | Shows error message | |
| L6 | Account not in DB | Login with Firebase user not in `accounts` table | Shows ACCOUNT_NOT_FOUND error | |
| L7 | Forgot password link | Tap "Forgot Password" | Navigates to PasswordReset screen | |
| L8 | Session persistence | Login → close app → reopen | Stays logged in | |
| L9 | Logout | Navigate to profile → logout | Returns to Login screen | |
| L10 | Network offline | Turn off WiFi → try to login | Shows network error gracefully | |

---

## 🏖️ 2. PTO (Book Time Off) Flow

### Prerequisites
- Logged in as any role
- `pto_requests` table exists in database
- `/pto` API route is registered

---

### Test Cases

#### Viewing PTO Requests

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| P1 | View PTO list | Navigate to Book Time Off | Shows list of PTO requests | |
| P2 | Empty state | No PTO requests in DB | Shows "No PTO requests found" message | |
| P3 | Status colors | View list with mixed statuses | Pending=yellow, Approved=green, Denied=red | |
| P4 | Date display | View a PTO card | Shows formatted start and end dates | |

#### Submitting PTO Request

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| P5 | Open form | Tap "New PTO Request" button | Form expands | |
| P6 | Close form | Tap "Cancel" button | Form collapses | |
| P7 | Valid submission | Fill all fields → tap Submit | Success alert + request appears in list | |
| P8 | Missing name | Leave name blank → tap Submit | Shows "Missing Fields" alert | |
| P9 | Missing start date | Leave start date blank → tap Submit | Shows "Missing Fields" alert | |
| P10 | Missing end date | Leave end date blank → tap Submit | Shows "Missing Fields" alert | |
| P11 | Optional reason | Submit without reason | Submits successfully | |
| P12 | Date format | Enter date in wrong format | API returns validation error | |
| P13 | Network offline | Turn off WiFi → submit | Shows error alert | |

---

## 📋 3. Work Request Flow

### Prerequisites
- Logged in as any role
- Work requests exist in `work_reqs` table
- API `/reqs` route is running

---

### Test Cases

#### Viewing Work Requests

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| W1 | View list | Navigate to View Work Requests | Shows all work request cards | |
| W2 | Empty state | No work requests in DB | Shows "No work requests found" | |
| W3 | Status badges | View cards with different statuses | Correct color badge shown per status | |
| W4 | Reference number | View a card | Shows reference number (e.g. REQ-001) | |
| W5 | Submitted by | View a card | Shows technician name | |
| W6 | Due date | View a card with due date | Shows formatted due date | |
| W7 | Open details | Tap arrow on a card | Navigates to WorkRequestDetails | |

#### Submitting Work Request

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| W8 | Open form | Navigate to Submit a Work Request | Form renders correctly | |
| W9 | Valid submission | Fill required fields → submit | Success message shown | |
| W10 | Missing required fields | Leave required fields blank → submit | Validation error shown | |
| W11 | Photo upload | Tap Upload Photo → select image | Image attached to form | |
| W12 | Large image | Upload image over 5MB | Error: file too large | |
| W13 | Wrong file type | Upload a PDF | Error: invalid file type | |
| W14 | After submit | Submit successfully | New request appears in View list | |

#### Work Request Details

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| W15 | View details | Tap arrow on work request card | Details screen loads | |
| W16 | All fields shown | View details | All submitted fields visible | |
| W17 | Photo shown | Request has photo | Photo renders in details | |
| W18 | Back navigation | Tap back | Returns to Work Request list | |

---

## 📅 4. Schedule / Calendar Flow

| # | Test | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| S1 | View calendar | Navigate to Event Calendar | Calendar renders with current month | |
| S2 | Event dots | Days with events | Green dot shown under date | |
| S3 | Tap date | Tap a day with events | Events for that day shown below | |
| S4 | Tap empty date | Tap a day with no events | "No events on this day" shown | |
| S5 | Month navigation | Tap prev/next arrows | Month changes correctly | |
| S6 | Weekly schedule | Navigate to Weekly Schedule | Shows list of upcoming events | |
| S7 | Empty schedule | No events in DB | Shows "No schedule events found" | |

---

## 🔁 Regression Checklist

Run after any code change:

- [ ] Login still works
- [ ] HomePage menu items all navigate correctly
- [ ] NavBar tabs work from all screens
- [ ] Work Request submission saves to DB
- [ ] PTO submission saves to DB
- [ ] Schedule loads from API
- [ ] Dashboard displays all 4 KPI cards
- [ ] No console errors on app start

---

## 📝 Test Environment

| Item | Value |
|---|---|
| Device | Android phone / Emulator |
| Expo SDK | 54 |
| API URL | `http://<local_ip>:3001` |
| DB | MySQL via Docker |
| Auth | Firebase |

---