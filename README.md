# HostelNest - Hostel Management System 

## Overview

  The Hostel Management System is a web-based application designed to simplify hostel administration by managing student records, room allocation, fee tracking,     and complaints in a centralized platform.

The system reduces manual paperwork and improves efficiency for both hostel administrators and students.

## Features
 -Student Registration and Management
 
 -Room Allocation and Availability Tracking
 
 -Fee Management
 
 -Complaint Registration and Tracking
 
 -Dashboard for Hostel Administration
 
 -Responsive User Interface
 
 -Real-time Data Management
 
 # Tech Stack
### Frontend
 -HTML5
 
 -CSS3
 
 -JavaScript
 
### Backend
  -Node.js
  
  -Express.js
  
### Database
  -MongoDB
  
  -Mongoose
  

---

## Directory Structure

```
├── backend/
│   ├── db.json          # File-based JSON database (persists additions/checkouts/payments)
│   ├── server.js        # Node.js + Express REST API Server (running on Port 5000)
│   └── package.json     # Backend server dependencies (express, cors)
│
└── frontend/
    ├── index.html       # Gorgeous glassmorphic frontend UI dashboard
    ├── style.css        # Premium stylesheets (fonts, variables, cards, tables, animations)
    └── app.js           # Client controller making fetch calls to Backend API
```

---

## Getting Started

### 1. Launch the Backend Server

To start the REST API database server:
1. Open your terminal in the `./backend/` directory.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Boot up the server:
   ```bash
   npm start
   ```
The backend server will run at: `http://localhost:5000`

### 2. Launch the Frontend UI

To open the portal dashboard:
- Simply open the [frontend/index.html](file:///c:/Users/karth/OneDrive/Desktop/new/frontend/index.html) file directly in your web browser, OR serve it with a static web server (such as Python's `http.server` or npm's `http-server`).
- Make sure the backend server is running so that the student directory, room visualization grids, daily attendance marker, and invoicing databases synchronize successfully!
