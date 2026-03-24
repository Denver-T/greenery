# 🌱 Greenery Platform

Greenery is a full-stack mobile and web platform designed to manage plant maintenance and greenhouse operations.  
The system supports technicians in the field as well as managers and administrators through a centralized system.

This project was developed as a **team-based capstone project** using Agile (Scrum) methodology.

---

## 🧩 Architecture Overview

Mobile App (React Native)  
→ Firebase Authentication (JWT)  
→ Backend API (Node.js / Express)  
→ MySQL Database  

---

## 🚀 Core Features

### Technicians (Mobile)
- View assigned tasks  
- Update task status and submit notes  
- Access plant-specific details  

### Managers / Administrators (Web)
- Manage users and roles  
- Assign and track tasks  
- View operational data  

### Backend API
- RESTful API with structured routing  
- Role-based access control  
- Authentication and authorization  
- Database-backed persistence  

---

## ⚙️ Tech Stack

**Frontend**
- React Native (Expo)  
- Next.js  
- Tailwind CSS  

**Backend**
- Node.js  
- Express.js  

**Database**
- MySQL (Docker for local development)  

**Tools**
- Firebase Authentication  
- Azure  
- Git / GitHub  
- Postman  

---

## 🛠️ Development Focus Areas

- Role-based access control (technician, manager, admin)  
- Task lifecycle management (assigned → in progress → completed)  
- Secure authentication using Firebase and backend verification  
- Structured API validation and error handling  
- End-to-end data flow between mobile, API, and database  

---

## 👨‍💻 Contributions (Backend & API)

- Designed and implemented RESTful endpoints for tasks and work requests  
- Contributed to backend architecture and route structure  
- Implemented authentication flow using Firebase and JWT verification  
- Added validation and error handling for API endpoints  
- Debugged data flow issues across mobile client, API, and database  
- Assisted in aligning database schema with application requirements  

---

## 🧠 Key Learnings

- Understanding authentication flows across client and backend systems  
- Debugging issues across multiple layers of a full-stack application  
- Structuring APIs for maintainability and scalability  
- Collaborating within an Agile team environment  

---

## 🛠️ Running the Project

```bash
# API
cd apps/api
npm install
npm run dev

# Mobile
cd apps/mobile
npm install
npx expo start

# Web
cd apps/web
npm install
npm run dev
