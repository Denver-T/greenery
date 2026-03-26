# 🌱 Greenery — Seed & Setup Guide
 
---
 
## Prerequisites
 
- Docker running: `docker-compose up -d`
- API running: `npm start`
- DB accessible: `http://localhost:3001/db-health` → ok
 
---
 
## How to Run Seeds
 
### Option A — Adminer (easiest)
1. Open `http://localhost:8080`
2. Login (server: `greenery_mysql`, user: `greenery_user`, pass: `greenery_pass`, db: `greenery`)
3. Click **SQL command**
4. Paste and run each block below **in order**
 
### Option B — Docker terminal
```bash
docker exec -it greenery_mysql mysql -u greenery_user -pgreenery_pass greenery
```
Paste each SQL block, press Enter. Type `exit` when done.
 
---
 
## Seed Blocks (run in order)
 
### 1. Accounts
```sql
INSERT IGNORE INTO accounts (name, role, email) VALUES
('Denver T',      'administrator', 'denvertimlick@gmail.com'),
('Sarah Manager', 'manager',       'sarah@greenery.com'),
('John Tech',     'technician',    'john@greenery.com');
```
 
### 2. Employees
```sql
INSERT IGNORE INTO employees (name, role, email, phone, status, permissionLevel) VALUES
('John Smith',    'Technician',    'john@greenery.com',   '555-0001', 'Active',   'Technician'),
('Sarah Lee',     'Manager',       'sarah@greenery.com',  '555-0002', 'Active',   'Manager'),
('Mike Johnson',  'Technician',    'mike@greenery.com',   '555-0003', 'Active',   'Technician'),
('Emily Davis',   'Administrator', 'emily@greenery.com',  '555-0004', 'Active',   'Administrator'),
('Carlos Rivera', 'Technician',    'carlos@greenery.com', '555-0005', 'Inactive', 'Technician');
```
 
### 3. Plants
```sql
INSERT IGNORE INTO plants (name, location) VALUES
('Orchid',          'Greenhouse A'),
('Fiddle Leaf Fig', 'Greenhouse B'),
('Fern',            'Greenhouse A'),
('Croton',          'Outdoor'),
('Moss',            'Greenhouse C'),
('Peace Lily',      'Greenhouse B'),
('Snake Plant',     'Greenhouse A'),
('Pothos',          'Greenhouse C');
```
 
### 4. Work Requests
```sql
INSERT INTO work_reqs (referenceNumber, requestDate, techName, account, accountContact, accountAddress, actionRequired, numberOfPlants, plantWanted, plantSize, lighting, method, location, notes, dueDate, status, assignedTo) VALUES
('REQ-001','2026-03-22','John Smith',  'ABC Company', 'Jane Doe',  '123 Main St',   'Plant replacement needed',3,'Orchid',         'Medium','Low',   'Standard replacement','Reception Area','Minimal disruption please','2026-03-28','unassigned',NULL),
('REQ-002','2026-03-22','Mike Johnson','XYZ Corp',    'Bob Wilson','456 Oak Ave',   'Soil top-up required',   0, NULL,             NULL,   'Medium','Soil refresh',        'Office Floor 3', NULL,                     '2026-03-25','assigned',  1),
('REQ-003','2026-03-21','Sarah Lee',   'Green Office','Tom Brown', '789 Pine Rd',   'New plant installation', 5,'Fiddle Leaf Fig','Large', 'High',  'New installation',    'Boardroom',     'Coord with building mgmt','2026-03-30','in_progress',3),
('REQ-004','2026-03-20','Denver T',    'City Hall',   'Mary White','1 City Square', 'Monthly maintenance',    0, NULL,             NULL,    NULL,   'Routine maintenance', 'Main Lobby',    'All plants done',        '2026-03-22','completed', 2),
('REQ-005','2026-03-23','John Smith',  'Tech Hub',    'Alex Chen', '999 Tech Blvd', 'Emergency plant rescue', 2,'Fern',           'Small', 'Low',   'Emergency replace',   'Breakroom',     'Severely dehydrated',    '2026-03-24','cancelled', NULL);
```
 
### 5. Schedule Events
```sql
INSERT INTO schedule_events (title, start_time, end_time, employee_id, work_req_id) VALUES
('Morning Planting',       '2026-03-24 08:00:00', '2026-03-24 12:00:00', 1,    NULL),
('Client Visit - ABC Co',  '2026-03-25 10:00:00', '2026-03-25 11:00:00', 2,    1   ),
('Team Meeting',           '2026-03-26 09:00:00', '2026-03-26 10:00:00', NULL, NULL),
('Greenhouse Audit',       '2026-03-27 13:00:00', '2026-03-27 15:00:00', 2,    NULL),
('Plant Delivery',         '2026-03-28 08:00:00', '2026-03-28 09:30:00', 3,    NULL),
('Monthly Review',         '2026-03-31 14:00:00', '2026-03-31 16:00:00', NULL, NULL);
```
 
### 6. PTO Requests *(only if `pto_requests` table exists)*
```sql
INSERT INTO pto_requests (employee_id, employee_name, start_date, end_date, reason, status) VALUES
(1, 'John Smith',   '2026-03-28', '2026-03-29', 'Family event',        'pending'),
(2, 'Sarah Lee',    '2026-04-01', '2026-04-03', 'Vacation',            'approved'),
(3, 'Mike Johnson', '2026-04-10', '2026-04-11', 'Medical appointment', 'pending'),
(1, 'John Smith',   '2026-04-15', '2026-04-15', 'Personal day',        'denied');
```
 
---
 
## Verify Seed
 
```sql
SELECT 'accounts'        AS tbl, COUNT(*) AS rows FROM accounts
UNION ALL SELECT 'employees',    COUNT(*) FROM employees
UNION ALL SELECT 'plants',       COUNT(*) FROM plants
UNION ALL SELECT 'work_reqs',    COUNT(*) FROM work_reqs
UNION ALL SELECT 'schedule_events', COUNT(*) FROM schedule_events;
```
 
Expected: accounts=3, employees=5, plants=8, work_reqs=5, schedule_events=6
 
---
 
## Reset All Data
 
```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE schedule_events;
TRUNCATE TABLE work_reqs;
TRUNCATE TABLE plants;
TRUNCATE TABLE employees;
TRUNCATE TABLE accounts;
SET FOREIGN_KEY_CHECKS = 1;
```
 
---
 
## Add a New User
 
```bash
# 1. Add in Firebase Console → Authentication → Users → Add user
# 2. Run setRole script:
cd apps/api
node setRole.js their@email.com technician
# Valid roles: technician, manager, admin
```