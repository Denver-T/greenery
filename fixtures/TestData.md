# 🌱 Greenery — Test Data & Fixtures

This file contains sample SQL seed data and mock JSON payloads for local development and testing.

---

## 🗄️ SQL Seed Data

Run this in Adminer (`http://localhost:8081`) or directly in MySQL after the schema is set up.

### Accounts
```sql
INSERT INTO accounts (name, role, email) VALUES
('Denver T',     'administrator', 'denvertimlick@gmail.com'),
('Sarah Manager','manager',       'sarah@greenery.com'),
('John Tech',    'technician',    'john@greenery.com');
```

### Employees
```sql
INSERT INTO employees (name, role, email, phone, status, permissionLevel) VALUES
('John Smith',   'Technician',    'john@greenery.com',  '555-0001', 'Active', 'Technician'),
('Sarah Lee',    'Manager',       'sarah@greenery.com', '555-0002', 'Active', 'Manager'),
('Mike Johnson', 'Technician',    'mike@greenery.com',  '555-0003', 'Active', 'Technician'),
('Emily Davis',  'Administrator', 'emily@greenery.com', '555-0004', 'Active', 'Administrator');
```

### Plants
```sql
INSERT INTO plants (name, location) VALUES
('Orchid',          'Greenhouse A'),
('Fiddle Leaf Fig', 'Greenhouse B'),
('Fern',            'Greenhouse A'),
('Croton',          'Outdoor'),
('Moss',            'Greenhouse C'),
('Peace Lily',      'Greenhouse B'),
('Snake Plant',     'Greenhouse A');
```

### Work Requests
```sql
INSERT INTO work_reqs (
  referenceNumber, requestDate, techName, account,
  accountContact, accountAddress, actionRequired,
  numberOfPlants, plantWanted, status, dueDate
) VALUES
('REQ-001', '2026-03-22', 'John Smith',   'ABC Company',   'Jane Doe',   '123 Main St',   'Plant replacement needed',  3, 'Orchid',          'unassigned', '2026-03-28'),
('REQ-002', '2026-03-22', 'Mike Johnson', 'XYZ Corp',      'Bob Wilson', '456 Oak Ave',   'Soil top-up required',      0, NULL,              'assigned',   '2026-03-25'),
('REQ-003', '2026-03-21', 'Sarah Lee',    'Green Office',  'Tom Brown',  '789 Pine Rd',   'New plant installation',    5, 'Fiddle Leaf Fig', 'in_progress','2026-03-30'),
('REQ-004', '2026-03-20', 'Denver T',     'City Hall',     'Mary White', '1 City Square', 'Monthly maintenance',       0, NULL,              'completed',  '2026-03-22'),
('REQ-005', '2026-03-23', 'John Smith',   'Tech Hub',      'Alex Chen',  '999 Tech Blvd', 'Emergency plant rescue',    2, 'Fern',            'unassigned', '2026-03-24');
```

### Schedule Events
```sql
INSERT INTO schedule_events (title, start_time, end_time, employee_id) VALUES
('Morning Planting',    '2026-03-24 08:00:00', '2026-03-24 12:00:00', 1),
('Client Visit - ABC',  '2026-03-25 10:00:00', '2026-03-25 11:00:00', 2),
('Team Meeting',        '2026-03-26 09:00:00', '2026-03-26 10:00:00', NULL),
('Greenhouse Audit',    '2026-03-27 13:00:00', '2026-03-27 15:00:00', 2),
('Plant Delivery',      '2026-03-28 08:00:00', '2026-03-28 09:30:00', 3),
('Monthly Review',      '2026-03-31 14:00:00', '2026-03-31 16:00:00', NULL);
```

### PTO Requests
```sql
INSERT INTO pto_requests (employee_id, employee_name, start_date, end_date, reason, status) VALUES
(1, 'John Smith',   '2026-03-28', '2026-03-29', 'Family event',          'pending'),
(2, 'Sarah Lee',    '2026-04-01', '2026-04-03', 'Vacation',              'approved'),
(3, 'Mike Johnson', '2026-04-10', '2026-04-11', 'Medical appointment',   'pending'),
(1, 'John Smith',   '2026-04-15', '2026-04-15', 'Personal day',          'denied');
```

---

## 📦 Mock JSON Payloads

Use these with Postman or for unit tests.

### POST /reqs — Create Work Request
```json
{
  "referenceNumber": "REQ-TEST-001",
  "requestDate": "2026-03-25",
  "techName": "John Smith",
  "account": "Test Company",
  "accountContact": "Test Contact",
  "accountAddress": "123 Test Street",
  "actionRequired": "Test plant replacement",
  "numberOfPlants": 2,
  "plantWanted": "Orchid",
  "plantSize": "Medium",
  "lighting": "Low",
  "notes": "This is a test work request",
  "dueDate": "2026-04-01",
  "status": "unassigned"
}
```

### POST /schedule — Create Schedule Event
```json
{
  "title": "Test Event",
  "start_time": "2026-03-30 09:00:00",
  "end_time": "2026-03-30 10:00:00",
  "employee_id": 1,
  "work_req_id": null
}
```

### POST /pto — Create PTO Request
```json
{
  "employee_name": "John Smith",
  "employee_id": 1,
  "start_date": "2026-04-05",
  "end_date": "2026-04-07",
  "reason": "Family vacation"
}
```

### POST /auth (Firebase token exchange)
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🧪 Expected API Responses

### GET /health
```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2026-03-25T00:00:00.000Z"
}
```

### GET /schedule (success)
```json
[
  {
    "id": 1,
    "title": "Morning Planting",
    "start_time": "2026-03-24T14:00:00.000Z",
    "end_time": "2026-03-24T18:00:00.000Z",
    "work_req_id": null,
    "employee_name": "John Smith"
  }
]
```

### GET /reqs (success)
```json
[
  {
    "id": 1,
    "referenceNumber": "REQ-001",
    "requestDate": "2026-03-22",
    "techName": "John Smith",
    "account": "ABC Company",
    "status": "unassigned",
    "dueDate": "2026-03-28"
  }
]
```

### Error response (401 Unauthorized)
```json
{
  "status": "error",
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid token",
  "details": [],
  "timestamp": "2026-03-25T00:00:00.000Z"
}
```

### Error response (404 Not Found)
```json
{
  "status": "error",
  "code": "ROUTE_NOT_FOUND",
  "message": "Route not found: GET /unknown",
  "details": [],
  "timestamp": "2026-03-25T00:00:00.000Z"
}
```

---

## 🔧 Quick Reset Script

To reset all test data (run in Adminer SQL command):

```sql
-- Clear all test data (keeps schema intact)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE schedule_events;
TRUNCATE TABLE pto_requests;
TRUNCATE TABLE work_reqs;
TRUNCATE TABLE plants;
TRUNCATE TABLE employees;
TRUNCATE TABLE accounts;
SET FOREIGN_KEY_CHECKS = 1;
```