# 🌱 Salsa Verde Platform

Salsa Verde is a full-stack mobile and web platform designed to manage plant maintenance and greenhouse operations.  
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
    
🗄️ Database Setup (Docker – Local Development)

The project uses MySQL. For local development, MySQL runs in Docker to ensure a consistent environment across the team.

Prerequisites

Install and start Docker Desktop.

Verify Docker is available:
docker --version
docker compose version

1) Start the MySQL container

From the repository root:
cd apps/api/db
docker compose up -d

Check that the container is running:
docker ps

2) Connection details (local)

Use the following settings for local development:
    •    Host: localhost
    •    Port: 3306
    •    Database: greenery
    •    Username: greenery_user
    •    Password: greenery_pass
    •    Root password: rootpassword

3) Stop / Reset the database

Stop the container:
cd apps/api/db
docker compose down

Stop and remove all data (full reset):
cd apps/api/db
docker compose down -v

Notes
    •    This Docker database is for local development only
    •    Production deployment will use Azure MySQL in a later phase
