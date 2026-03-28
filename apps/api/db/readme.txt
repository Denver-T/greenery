Greenery API database notes
===========================

Local Docker MySQL is used for development consistency.

Run from:
  apps/api/db

Commands:
  docker compose up -d
  docker compose down
  docker compose down -v   (destroys local data)

Local connection defaults:
  host: 127.0.0.1
  port: 3307
  database: greenery
  user: greenery_user

Adminer:
  http://localhost:8080

Schema initialization:
  init/01_schema.sql

Key tables:
  employees
  plants
  work_reqs
  schedule_events
  notifications
  activity_logs

Important:
  - `permissionLevel` is the platform access model
  - `role` remains the operational job role
  - `activity_logs` supports super-admin governance and privileged audit history
  - do not commit `.env` files
