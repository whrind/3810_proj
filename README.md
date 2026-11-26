# TrailMate HK — Hong Kong Hiking Trail, Transport & Community Hub

## 1. Project Info
- **Project Name:** TrailMate HK — Hong Kong Hiking Trail, Transport & Community Hub
- **Course:** COMP 3810SEF Autumn 2026 — Group Project (Server-Side Application)
- **Purpose:** TrailMate HK is a full-stack server-side web application built with **Express.js**, **MongoDB (Mongoose)**, and **EJS**. It helps Hong Kong hikers discover local trails with **verified real MTR, bus, minibus, ferry, and Google Maps trailhead directions**, filter routes by multiple conditions, save favorite trails, join group meetups, and discuss hiking conditions in a dedicated **Hiking Forum** (with category, trail, keyword, and date-range filters). The UI supports **Dark / Light Theme switching** and **Trilingual translation (English / 繁體中文 / 简体中文)**.

---

## 2. Group Info
- **Group Number:** `[Group No., e.g. Group 1]` *(Rename the project folder and zip archive to `comp3810sef_group<No>` before submission.)*

### Group Members & Workload Division
| Member | Student Name | Student ID (SID) | Work Role & Responsibilities |
| :--- | :--- | :--- | :--- |
| Member 1 | `[Member 1 Name]` | `[SID 1]` | **Project Lead & Backend Core (`server.js`):** Express.js architecture, middleware pipeline, route integration, DB seeding, and deployment/packaging. |
| Member 2 | `[Member 2 Name]` | `[SID 2]` | **Database & Schema Modeling (`models/`):** MongoDB/Mongoose connection, `User`, `Trail` (with real transport fields), and `ForumPost` schemas and indexes. |
| Member 3 | `[Member 3 Name]` | `[SID 3]` | **Authentication & Security:** Login/Register/Logout flows, `express-session` cookies, `bcryptjs` password hashing, and `requireAuth` access control. |
| Member 4 | `[Member 4 Name]` | `[SID 4]` | **CRUD Web Views & Hiking Forum (`views/`):** EJS templates for Trail CRUD, multi-condition search, bookmarks, and the Hiking Forum (date/category filters, likes, replies). |
| Member 5 | `[Member 5 Name]` | `[SID 5]` | **UI/UX, Dark/Light Theme & i18n (`public/`):** Dark/Light theme CSS system (`style.css`), trilingual EN/繁體/简体 translation engine (`i18n.js`), and interactive JS (`main.js`). |
| Member 6 | `[Member 6 Name]` | `[SID 6]` | **RESTful API, Testing & Documentation:** Unauthenticated RESTful APIs (`/api/trails`, `/api/forum`, `/api/stats`), `curl` test commands, `README.md`, and 10-minute demo script. |

---

## 3. Project File Intro
```text
comp3810sef_groupX/
├── server.js                 # Express.js entry point: auth, protected Trail CRUD, Hiking Forum, REST APIs, real HK seed data
├── package.json              # Project metadata, npm scripts, and dependency list
├── .env.example              # Sample environment variables (PORT, MONGODB_URI, SESSION_SECRET)
├── models/
│   ├── User.js               # Mongoose User schema with bcryptjs pre-save hashing
│   ├── Trail.js              # Mongoose Trail schema (district, difficulty, real MTR/bus/ferry transport, Google Maps URL, bookmarks)
│   └── ForumPost.js          # Mongoose ForumPost schema (category, relatedTrail, likes, nested comments, timestamps)
├── public/
│   ├── css/style.css         # Responsive Dark/Light theme design system with sidebar app-shell and forum styling
│   ├── js/i18n.js            # Trilingual UI dictionary (English, Traditional Chinese zh-HK, Simplified Chinese zh-CN)
│   └── js/main.js            # Theme toggle, language switcher, forum date presets, flash alerts, delete confirmation
├── views/
│   ├── partials/header.ejs   # Shared top navbar with Forum link, EN/繁/简 selector, Dark/Light toggle, and Log Out button
│   ├── partials/footer.ejs   # Shared footer and client-side script loader
│   ├── login.ejs             # Sign-in page with pre-seeded demo account quick-fill buttons
│   ├── register.ejs          # New user account registration page
│   ├── dashboard.ejs         # Protected Trail Tracker with district sidebar, Saved Trails, HKO widget, transport previews & CRUD
│   ├── create.ejs            # Protected Create form for adding a trail (including MTR, bus, return transport & Google Maps URL)
│   ├── detail.ejs            # Full trail view with Getting There transport panel, Google Maps button, gear checklist & RSVP
│   ├── edit.ejs              # Protected Update form for editing an existing trail
│   └── forum.ejs             # Protected Hiking Discussion Forum with category sidebar, date-range filters, likes & replies
└── README.md                 # Project documentation and operation guide
```

---

## 4. Operation Guides

### 4.1 Installation & Launch
1. Install dependencies: `npm install`
2. Ensure local MongoDB is running (`mongodb://127.0.0.1:27017/trailmate_hk`), or copy `.env.example` to `.env` and set `MONGODB_URI` for MongoDB Atlas.
3. Start the server: `npm start`
   - *Note:* If upgrading from an older local database that already had trails without transport fields, drop the old `trails` collection once (e.g., `db.trails.drop()` in `mongosh`) and restart `npm start` so the server auto-seeds the 6 trails with full real MTR/bus/ferry transport data and 4 forum posts.
4. Open `http://localhost:3000`.

### 4.2 Login / Logout, Theme & Language Controls
- **Demo Accounts:** `admin` / `password123` or `hiker1` / `password123` (or register a new account at `/register`).
- **Log Out:** Click **Log Out** in the top-right navbar on any authenticated page.
- **Dark / Light Theme:** Click the Sun/Moon icon in the top-right navbar (persisted automatically).
- **Language Switcher:** Select **EN**, **繁體中文**, or **简体中文** from the top-right dropdown.

### 4.3 Web CRUD Pages & Hiking Forum
- **Trail Tracker (`/trails`):** Filter by district (left sidebar), **My Saved Trails**, keyword (name, MTR, bus, gear), difficulty, status, max distance, and sort order. Click **Save** to bookmark, **Join Hike** to RSVP, **Google Maps** to open the trailhead, or **+ Add Trail** / **Edit** / **Delete**.
- **Hiking Forum (`/forum`):** Filter discussions by **Category** (left sidebar), **Date From / Date To** (or quick presets: Today / Last 7 Days / Last 30 Days), **Related Trail**, **Keyword**, and **Sort** (Newest, Oldest, Most Liked, Most Discussed). Publish new posts, reply with comments, toggle star likes, or delete posts.

### 4.4 RESTful CRUD APIs (No Authentication Required)
| Resource | Method | URI | Description |
| :--- | :--- | :--- | :--- |
| Trails | `GET` | `/api/trails` | List/filter trails (`?district=&difficulty=&status=&maxDistance=&q=&sort=`) |
| Trails | `GET` | `/api/trails/:id` | Get one trail by ID |
| Trails | `POST` | `/api/trails` | Create a new trail |
| Trails | `PUT` | `/api/trails/:id` | Update a trail by ID |
| Trails | `DELETE` | `/api/trails/:id` | Delete a trail by ID |
| Forum | `GET` | `/api/forum` | List/filter forum posts (`?category=&q=&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`) |
| Forum | `POST` | `/api/forum` | Create a new forum post |
| Forum | `PUT` | `/api/forum/:id` | Update a forum post by ID |
| Forum | `DELETE` | `/api/forum/:id` | Delete a forum post by ID |
| Stats | `GET` | `/api/stats` | Aggregate counts by district & total forum posts |

#### Quick `curl` Testing Commands
```bash
# 1. GET all trails
curl -X GET "http://localhost:3000/api/trails"

# 2. GET filtered trails
curl -X GET "http://localhost:3000/api/trails?district=New%20Territories&difficulty=Moderate"

# 3. POST create a trail
curl -X POST "http://localhost:3000/api/trails" \
  -H "Content-Type: application/json" \
  -d '{"trailName":"Sharp Peak","district":"New Territories","difficulty":"Expert","distanceKm":12.0,"durationHrs":6.0,"elevationM":468,"meetingPoint":"Sai Kung Bus Terminus","nearestMtr":"Choi Hung / Hang Hau MTR","busRoutes":"KMB 94 to Pak Tam Au","description":"Steep coastal peak in Sai Kung East."}'

# 4. PUT update a trail (replace <TRAIL_ID>)
curl -X PUT "http://localhost:3000/api/trails/<TRAIL_ID>" \
  -H "Content-Type: application/json" \
  -d '{"trailStatus":"Caution - Weather","maxParticipants":10}'

# 5. DELETE a trail (replace <TRAIL_ID>)
curl -X DELETE "http://localhost:3000/api/trails/<TRAIL_ID>"

# 6. GET forum posts filtered by date range
curl -X GET "http://localhost:3000/api/forum?dateFrom=2026-11-20&dateTo=2026-11-30"
```
