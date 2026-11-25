# TrailMate HK

**Hong Kong Hiking Trail & Group Meetup Hub** — COMP 3810SEF Autumn 2026 Group Project (Server-Side Application)

> [!IMPORTANT]
> Before submission, replace every `[Group No.]`, `[Member N Name]`, and `[SID N]` placeholder in this README and in the Word report with the real group details. Rename the folder and archive to `comp3810sef_group<No>` / `comp3810sef_group<No>.zip`, and make sure `node_modules/` is not included.

---

## 1. Overview

TrailMate HK is a server-side web application for Hong Kong hikers and university outdoor clubs. It brings structured trail data, practical route filtering, and group meetup coordination into one application with **two access modes**:

- **Session-protected EJS web pages** for signed-in users to browse, create, update, delete, and RSVP to trails, with live KPI metrics on the dashboard.
- **Unauthenticated RESTful JSON APIs** (`/api/*`) so external clients and examiners can exercise full CRUD directly with `curl` or Postman.

Why this topic: Hong Kong trails naturally carry structured attributes — district, difficulty, distance, elevation gain, trail status, meetup date, meeting point, and gear checklist — which map cleanly to Mongoose schemas, validation, aggregation, and query filters. On first launch against an empty database, the server seeds **2 demo accounts and 6 iconic Hong Kong trails** (Dragon's Back, Lion Rock, MacLehose Section 2, and others), so the app is immediately demoable with no manual data setup.

---

## 2. Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| Runtime | Node.js `>=18` | Server runtime (`npm start` / `npm run dev`) |
| Web framework | Express.js 4 | HTTP routing, middleware, session pipeline, error handling |
| Database | MongoDB + Mongoose 8 | Two collections (`users`, `trails`), schema validation, indexes, aggregation |
| Templates | EJS 3 | Server-rendered pages with shared header/footer partials |
| Auth | express-session + bcryptjs | Cookie sessions, `requireAuth` guard, hashed passwords |
| Configuration | dotenv | `PORT`, `MONGODB_URI`, `SESSION_SECRET` from `.env` |
| Frontend | Vanilla CSS / JS | Offline-ready responsive styling, flash messages, delete confirmation |
| Dev tooling | nodemon | Auto-restart during development |

---

## 3. Features

### Web application (login required)

| Feature | Route | Notes |
| :--- | :--- | :--- |
| Login / Registration / Logout | `/login`, `/register`, `/logout` | Demo accounts quick-fill; new users stored in MongoDB |
| Dashboard & multi-condition search | `/trails` | Keyword (name, meeting point, description, gear), district, difficulty, status, max distance, and 5 sort options; live KPI cards |
| Trail detail | `/trails/:id` | Gear checklist, safety notes, participants, Edit / Delete / RSVP |
| Create | `/trails/new` | Full validated trail form |
| Update | `/trails/:id/edit` → `POST /trails/:id/update` | Pre-filled form with Mongoose validation |
| Delete | `POST /trails/:id/delete` | Client-side confirmation before permanent removal |
| Group hike RSVP | `POST /trails/:id/join` | Join / leave toggle with capacity enforcement |

All web CRUD routes are guarded by `requireAuth`; unauthenticated visits to `/` or `/trails` redirect to `/login` with a flash message.

### RESTful API (no authentication required)

| Action | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Read all / filtered | `GET` | `/api/trails` | `?q=&district=&difficulty=&status=&maxDistance=&sort=` |
| Read one | `GET` | `/api/trails/:id` | Lookup by MongoDB ObjectId |
| Read statistics | `GET` | `/api/stats` | Total trails, per-district count and average distance |
| Create | `POST` | `/api/trails` | Create from JSON body |
| Update | `PUT` | `/api/trails/:id` | Partial update with schema validation |
| Delete | `DELETE` | `/api/trails/:id` | Delete by ID |

Supported `sort` values: `newest` (default), `distance_asc`, `distance_desc`, `elevation_desc`, `meetup_asc`. Responses use `success`, `data` / `count` / `totalTrails`, and standard status codes (`200`, `201`, `400`, `404`, `500`).

---

## 4. Project Structure

```text
comp3810sef_groupX/
├── server.js                 # Express entry point: sessions, auth, web CRUD, REST APIs, seed data
├── package.json              # Metadata, npm scripts, dependencies, Node engine
├── .env.example              # PORT / MONGODB_URI / SESSION_SECRET template
├── models/
│   ├── User.js               # User schema, bcrypt pre-save hash, comparePassword()
│   └── Trail.js              # Trail schema, enums, validation, text index
├── public/
│   ├── css/style.css         # Responsive design system (cards, badges, KPIs, forms)
│   └── js/main.js            # Flash auto-dismiss, demo login autofill, delete confirm
├── views/
│   ├── partials/header.ejs   # Shared head, navbar, logout, flash alerts
│   ├── partials/footer.ejs   # Shared footer and script loader
│   ├── login.ejs             # Sign-in with demo account quick-fill
│   ├── register.ejs          # Registration form
│   ├── dashboard.ejs         # KPI cards, filters, trail grid
│   ├── create.ejs            # New trail form
│   ├── detail.ejs            # Trail detail, gear list, RSVP
│   └── edit.ejs              # Edit trail form
└── README.md                 # This document
```

---

## 5. Data Models

### `User` (`models/User.js`)

| Field | Type | Constraints |
| :--- | :--- | :--- |
| `username` | String | Required, unique, 3–30 chars |
| `displayName` | String | Required, max 50 chars |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, min 6 chars, bcrypt-hashed before save |
| `role` | String | `member` / `organizer` / `admin` (default `member`) |

### `Trail` (`models/Trail.js`)

| Field | Type | Constraints |
| :--- | :--- | :--- |
| `trailName` | String | Required, max 100 chars |
| `district` | String | Required; Hong Kong Island / Kowloon / New Territories / Lantau Island / Outlying Islands |
| `difficulty` | String | Required; Easy / Moderate / Challenging / Expert |
| `distanceKm` / `durationHrs` | Number | Required, `>= 0.5` |
| `elevationM` | Number | Default `0`, `>= 0` |
| `trailStatus` | String | Open / Caution - Weather / Maintenance (default Open) |
| `meetupDate` / `meetingPoint` | String | Meeting point required, max 120 chars |
| `maxParticipants` / `participants` | Number / [String] | Default `12` / `[]` |
| `gearChecklist` / `safetyNotes` | [String] / String | Optional; text index on name, meeting point, description |

---

## 6. Getting Started

### Prerequisites

- Node.js `>= 18` and npm
- A running MongoDB instance (local `mongod` or MongoDB Atlas URI)

### Install & run

```bash
npm install
cp .env.example .env       # Windows: copy .env.example .env
npm start                  # or: npm run dev  (nodemon)
```

Open <http://localhost:3000>. Defaults: port `3000`, database `mongodb://127.0.0.1:27017/trailmate_hk`. To use Atlas or a custom port, edit `.env`:

```dotenv
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<dbname>
SESSION_SECRET=change-this-secret-for-production
```

On first startup against an empty database, the server seeds demo users and trails automatically.

### Demo accounts

| Role | Username | Password |
| :--- | :--- | :--- |
| Admin | `admin` | `password123` |
| Organizer | `hiker1` | `password123` |

Sign in at `/login`, or create a new account at `/register`. Log out with the **Log Out** button in the navbar; this destroys the server session and clears the `trailmate.sid` cookie.

---

## 7. API Usage Examples

Replace `<TRAIL_ID>` with an `_id` returned by a GET or POST request, and replace `http://localhost:3000` with the deployed URL if applicable.

```bash
# Read all trails
curl -X GET "http://localhost:3000/api/trails"

# Combined filter
curl -X GET "http://localhost:3000/api/trails?district=New%20Territories&difficulty=Moderate&maxDistance=20"

# Aggregate statistics
curl -X GET "http://localhost:3000/api/stats"

# Create
curl -X POST "http://localhost:3000/api/trails" \
  -H "Content-Type: application/json" \
  -d '{
    "trailName": "Sharp Peak (Nam She Tsim)",
    "district": "New Territories",
    "difficulty": "Expert",
    "distanceKm": 12.0,
    "durationHrs": 6.0,
    "elevationM": 468,
    "trailStatus": "Open",
    "meetupDate": "2026-12-26",
    "meetingPoint": "Sai Kung Bus Terminus",
    "maxParticipants": 8,
    "gearChecklist": ["3L Water", "Gloves", "Trekking Poles"],
    "description": "Challenging coastal peak hike in Sai Kung East."
  }'

# Read one / update / delete
curl -X GET    "http://localhost:3000/api/trails/<TRAIL_ID>"
curl -X PUT    "http://localhost:3000/api/trails/<TRAIL_ID>" \
  -H "Content-Type: application/json" \
  -d '{"trailStatus":"Caution - Weather","maxParticipants":10}'
curl -X DELETE "http://localhost:3000/api/trails/<TRAIL_ID>"
```

---

## 8. Group Information & Workload Division

**Group:** `[Group No.]` · **Submission deadline:** 30 Nov 2026 (23:59)

| Member | Student Name | SID | Work Role & Responsibilities |
| :--- | :--- | :--- | :--- |
| Member 1 | `[Member 1 Name]` | `[SID 1]` | **Project Lead & Backend Core (`server.js`):** Express architecture, middleware pipeline, route integration, error handling, deployment/packaging. |
| Member 2 | `[Member 2 Name]` | `[SID 2]` | **Database & Schema Design (`models/`):** MongoDB connection, `User` / `Trail` schemas, validation, indexing, seed data. |
| Member 3 | `[Member 3 Name]` | `[SID 3]` | **Authentication & Security:** Login / Register / Logout, session cookies, bcrypt hashing, `requireAuth` protection. |
| Member 4 | `[Member 4 Name]` | `[SID 4]` | **CRUD Web Views & Search (`views/`):** EJS templates and dynamic MongoDB query filters. |
| Member 5 | `[Member 5 Name]` | `[SID 5]` | **UI/UX & Frontend Polish (`public/`):** Responsive CSS, visual hierarchy, client-side JS, confirmation dialogs. |
| Member 6 | `[Member 6 Name]` | `[SID 6]` | **RESTful API & Documentation:** Unauthenticated `/api/*` endpoints, `curl` test commands, this README, 10-minute demo script. |

### Pre-submission checklist

- [ ] Fill in real group number, member names, and SIDs here and in the Word report.
- [ ] Rename folder and archive to `comp3810sef_group<No>` / `.zip`.
- [ ] Confirm the zip contains **no `node_modules/`**.
- [ ] Every member has tested and understood their assigned module before submitting on OLE.
