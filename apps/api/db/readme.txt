Step 1 — Install Docker
Download and install Docker Desktop.
Open Docker Desktop and make sure it is running.

Verify installation:
docker --version
docker compose version

Step 2 — Start the Database

From the project root (the folder that contains apps/):
You can copy paste this into the terminal
cd apps/api/db
docker compose up -d

Step 3 — Confirm Containers Are Running
docker ps

You should see:

greenery_mysql

greenery_adminer

Step 4 — Open Adminer (Database UI)
Open your browser:
http://localhost:8080

Login using:
System: MySQL
Server: mysql
Username: greenery_user
Password: greenery_pass
Database: greenery

⚠️ IMPORTANT: Server must be mysql, NOT localhost.
Step 5 — Connect the API to the Database

Move to the API folder:

cd ../


Create your environment file:

Open .env and ensure it contains:

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=greenery
DB_USER=greenery_user
DB_PASSWORD=greenery_pass

Step 6 — Run the API
npm install
npm run dev

Step 7 — Reset Database (If Something Breaks)

From apps/api/db:
copy paste this:

docker compose down -v
docker compose up -d

This deletes all database data and recreates everything.

Step 8 — Stop the Database
cd apps/api/db
docker compose down

Notes:
Do NOT commit .env files
Database schema is located in apps/api/db/init
This setup is for local development only