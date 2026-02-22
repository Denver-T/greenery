-- apps/api/db/init/02_seed.sql
INSERT INTO plants (id, name, location) VALUES
  (1, 'Monstera Deliciosa', 'Lobby'),
  (2, 'Fiddle Leaf Fig', 'Conference Room')
ON DUPLICATE KEY UPDATE name=VALUES(name), location=VALUES(location);

INSERT INTO accounts (id, name, role, email) VALUES
  (1, 'Technician One', 'technician', 'tech1@example.com'),
  (2, 'Manager One', 'manager', 'manager1@example.com'),
  (3, 'Admin One', 'admin', 'admin1@example.com')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), email=VALUES(email);

INSERT INTO tasks (id, title, status, assigned_to, plant_id, notes) VALUES
  (1, 'Water Monstera', 'assigned', 1, 1, 'Weekly watering'),
  (2, 'Inspect Fiddle Leaf Fig', 'in_progress', 1, 2, 'Check for pests')
ON DUPLICATE KEY UPDATE
  title=VALUES(title), status=VALUES(status), assigned_to=VALUES(assigned_to), plant_id=VALUES(plant_id), notes=VALUES(notes);

INSERT INTO products (id, name, description, price, active) VALUES
  (1, 'Soil Top-Up (Small Bag)', 'Soil top-up for small planters', 9.99, TRUE),
  (2, 'Plant Replacement (Standard)', 'Standard indoor plant replacement service', 49.99, TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price), active=VALUES(active);
