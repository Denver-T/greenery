# 🌱 Greenery Platform

Greenery is a full-stack mobile and web platform designed to manage plant maintenance and greenhouse operations.  
The system supports technicians in the field as well as managers and administrators through a centralized web dashboard.

This project is developed as a **capstone project** using **Agile (Scrum) methodology** and industry-standard tools.

---

## ✨ Core Features (Planned)

### Technicians (Mobile Application)
- View assigned plant maintenance tasks
- Clock in and out to track work time
- Update task status and submit notes
- Access plant-specific instructions

### Managers & Administrators (Web Application)
- Manage users and roles
- Assign and schedule maintenance tasks
- Approve completed work and time entries
- View dashboard analytics (e.g., most-maintained plants)

### Backend API
- Centralized RESTful API
- Authentication and role-based authorization
- Database-backed persistence
- Aggregation of analytics data

---

## 📁 Project Structure
apps/
mobile/   # Expo (React Native) mobile application
web/      # Next.js web application (managers/admins)
api/      # Node.js + Express backend API
docs/       # Project documentation, diagrams, and planning artifacts

Each application runs independently and communicates with the backend API.

---

## 🛠️ Tech Stack

### Frontend
- JavaScript
- Expo (React Native) – mobile application
- Next.js (React) – web application
- Tailwind CSS – web UI styling

### Backend
- Node.js
- Express.js
- RESTful API architecture

### Database (Planned)
- MySQL
- Local development via Docker
- Cloud deployment via Microsoft Azure

### Tooling & Process
- Git & GitHub – version control
- Jira – Scrum project management
- Figma – UI/UX design
- Docker – local database environment

---

## 🚀 Getting Started (Team Setup)

### Prerequisites
- Node.js (LTS)
- npm
- Git
- Expo Go app (mobile developers only)

### Test my own branch

Verify installation:

```bash
node -v
npm -v
git --version

▶️ Running the Applications

📱 Mobile App (Expo)
cd apps/mobile
npm install
npx expo start
Scan the QR code using Expo Go.

🌐 Web App (Next.js)
cd apps/web
npm install
npm run dev
Open in a browser:http://localhost:3000

🔧 Backend API (Express)
cd apps/api
npm install
npm run dev

API runs at: http://localhost:3001
Health check endpoint: http://localhost:3001/health

🔁 Git Workflow

❌ Do NOT commit directly to main

Always create a feature branch:
git checkout -b feature/<short-description>

When finished:
    1.    Push your branch
    2.    Open a Pull Request
    3.    Request at least one review before merging
    
📌 Project Management
    •    Project is managed using Jira Scrum boards
    •    Work is organized into sprints
    •    Team members update Jira ticket status as work progresses:
    •    TO DO → IN PROGRESS → DONE
    
📊 Project Status

The project is under active development.
Current focus areas:
    •    Application scaffolding
    •    Authentication and role-based access
    •    Database integration
    •    Sprint-based feature delivery
    
Install the following:
Docker Desktop
Node.js (v18+ recommended)
HeidiSQL (for viewing database contents)

Verify installation:
docker --version
node -v
npm -v

🗄️ Database Setup (Docker – Local Development)
The project uses MySQL inside Docker for consistent development.

1️⃣ Start the Database
Navigate to:
cd apps/api/db

Start MySQL container:
docker compose up -d

Verify container is running:
docker ps

You should see:
0.0.0.0:3307->3306/tcp
Note: We use port 3307 locally to avoid conflicts with system MySQL.

2️⃣ Database Connection Info (Local)

Use these settings:

Setting	Value
Host	127.0.0.1
Port	3307
Database	greenery
Username	greenery_user
Password	greenery_pass
Root Password	rootpassword

🧰 HeidiSQL Setup
HeidiSQL is used to view and edit database records during development.
Create a New Session
Open HeidiSQL
Click New
Select MySQL (TCP/IP)
Enter:
Hostname/IP: 127.0.0.1
Port: 3307
User: greenery_user
Password: greenery_pass

Click Open
You should see the greenery database and tables like:
employees
plants
tasks
users

🚀 API Setup (Backend)
Navigate to:
cd apps/api

Install dependencies:
npm install

Ensure .env exists in apps/api:
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=greenery
DB_USER=greenery_user
DB_PASSWORD=greenery_pass

Start API:

npm run dev
API runs at:

http://localhost:3001
🔎 Test API

Health check:
http://localhost:3001/db-health

Employees endpoint:
http://localhost:3001/employees

If database is connected correctly, /employees should return:
[]     or a list of employees.

🌐 Web Setup (Frontend)
Navigate to:
cd apps/web

Install dependencies:
npm install

Create .env.local:
NEXT_PUBLIC_API_URL=http://localhost:3001

Start web server:
npm run dev

Web runs at:
http://localhost:3000

🔄 Reset Database (If Needed)
To completely reset the database:

cd apps/api/db
docker compose down -v
docker compose up -d

⚠️ This deletes all local data.

```
```
apps>api>.env 
# Server
PORT=3001
NODE_ENV=development

# Database (local Docker)
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=greenery
DB_USER=greenery_user
DB_PASSWORD=greenery_pass


# # Authentication (placeholder)
# AUTH_PROVIDER=firebase
# FIREBASE_PROJECT_ID=
# FIREBASE_CLIENT_EMAIL=
# FIREBASE_PRIVATE_KEY=

# # Monday.com Integration (placeholder)
# MONDAY_API_TOKEN=
# MONDAY_BOARD_ID=

apps>web>.env.local
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=greenery
DB_USER=greenery_user
DB_PASSWORD=greenery_pass
NEXT_PUBLIC_API_URL=http://localhost:3001
```
