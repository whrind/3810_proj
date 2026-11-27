# TrailMate HK
Cloud ver: https://3810-2da19.containers.snapdeploy.app
## 1. Project Info
- **Project Name:** TrailMate HK — Hong Kong Hiking Trail & Community Web App
- **Course:** COMP 3810SEF Autumn 2026
- **Overview:** A server-side Express.js + MongoDB (Mongoose) + EJS web application for browsing and managing Hong Kong hiking trails, real MTR/bus/ferry access details, group hike RSVPs, and a community discussion forum.

## 2. Group Info
- **Group Number:** `[Group No.39]`

| Member | Name | SID | Role |
| :--- | :--- | :--- | :--- |
| Member 1 | `[Chan Hiu Chun]` | `[14238060]` | Express server entry (`server.js`), routing setup, deployment & zip packaging |
| Member 2 | `[Chan Wai Nok]` | `[14063175]` | Mongoose schemas (`models/User.js`, `Trail.js`, `ForumPost.js`) & seed data (`config/seed.js`) |
| Member 3 | `[To Lok Yin]` | `[14218233]` | Authentication & authorization (`routes/auth.js`, `middleware/auth.js`, session security) |
| Member 4 | `[Lam Ka Ho]` | `[14096514` | Trail CRUD & Hiking Forum views (`routes/trails.js`, `routes/forum.js`, `views/`) |
| Member 5 | `[Tam Chi Tin]` | `[14019682]` | UI styling, dark/light theme, trail photos & EN/繁/简 translations (`public/`) |
| Member 6 | `[Fok Ho Fai]` | `[13187776]` | RESTful API (`routes/api.js`), input whitelisting, `curl` testing & documentation |

## 3. Project Files
- `server.js`: Main Express app entry point, session setup, view locals, and route mounting.
- `package.json`: Project metadata, scripts (`npm start`, `npm run dev`), and npm dependencies (`express`, `mongoose`, `ejs`, `express-session`, `bcryptjs`, `dotenv`).
- `config/`: `constants.js` (field whitelisting, query filters, pagination, HKT date helpers) and `seed.js` (initial demo users, 6 HK trails with real transport info, and 4 forum posts).
- `middleware/`: `auth.js` (`requireAuth` session guard and `canModify` owner/admin check).
- `models/`: `User.js`, `Trail.js`, and `ForumPost.js`.
- `routes/`: `auth.js`, `trails.js`, `forum.js`, and `api.js`.
- `public/`: `css/style.css` (light/dark theme), `js/i18n.js` (EN / 繁體中文 / 简体中文), `js/main.js`, and `images/` (local Hong Kong trail photos).
- `views/`: EJS templates for login, register, dashboard, create, detail, edit, forum, and shared header/footer partials.

## 4. Operation Guides

### Setup & Run
1. Run `npm install`.
2. Start local MongoDB (`mongodb://127.0.0.1:27017/trailmate_hk`), or copy `.env.example` to `.env` and set `MONGODB_URI`.
3. Run `npm start` and open `http://localhost:3000`.
4. If you have an older local `trails` collection from an earlier version, drop it once so the updated trails with photos and transport data seed automatically.

### Login, Logout & Permissions
- **Demo Accounts:** `admin` / `password123` (role: `admin`) and `hiker1` / `password123` (role: `organizer`). You can also register a new `member` account at `/register`.
- **Access Control:** Only logged-in users can enter `/trails` and `/forum`. On web pages, only the creator of a trail/post or an `admin` can edit or delete it.
- **Log Out:** Click **Log Out** in the top-right bar to destroy the session and clear the cookie.
- **Theme & Language:** Use the top-right Sun/Moon icon to toggle Light/Dark mode and the language selector for English, 繁體中文, or 简体中文.

### CRUD Web Pages & Forum
- **Trails (`/trails`):** Search by keyword (name, MTR, bus, gear), district sidebar, Saved Trails, difficulty, status, max distance, and sort order with pagination. Use **+ Add Trail**, **View**, **Edit**, **Delete**, **Join Hike**, and **Save**.
- **Forum (`/forum`):** Filter posts by category, keyword, HKT date range (with Today / 7 Days / 30 Days presets), related trail, and sort order. Create posts, add replies, like posts, or delete your own posts.

### RESTful CRUD APIs (No Authentication Required per Course Spec)
| Action | Method | Endpoint |
| :--- | :--- | :--- |
| Read trails | `GET` | `/api/trails` (supports `?district=&difficulty=&q=&page=&limit=`) |
| Read single trail | `GET` | `/api/trails/:id` |
| Create trail | `POST` | `/api/trails` |
| Update trail | `PUT` | `/api/trails/:id` |
| Delete trail | `DELETE` | `/api/trails/:id` |
| Forum CRUD | `GET / POST / PUT / DELETE` | `/api/forum` and `/api/forum/:id` |
| District stats | `GET` | `/api/stats` |

```bash
curl -X GET "http://localhost:3000/api/trails"
curl -X GET "http://localhost:3000/api/trails?district=New%20Territories&difficulty=Moderate"
curl -X POST "http://localhost:3000/api/trails" \
  -H "Content-Type: application/json" \
  -d '{"trailName":"Sharp Peak","district":"New Territories","difficulty":"Expert","distanceKm":12.0,"durationHrs":6.0,"elevationM":468,"meetingPoint":"Sai Kung Bus Terminus","nearestMtr":"Choi Hung MTR","busRoutes":"KMB 94 to Pak Tam Au","description":"Steep coastal peak in Sai Kung East."}'
curl -X PUT "http://localhost:3000/api/trails/<TRAIL_ID>" \
  -H "Content-Type: application/json" \
  -d '{"trailStatus":"Caution - Weather","maxParticipants":10}'
curl -X DELETE "http://localhost:3000/api/trails/<TRAIL_ID>"
curl -X GET "http://localhost:3000/api/forum?dateFrom=2026-11-20&dateTo=2026-11-30"
```
#### 1. Login test
```bash
curl -I https://3810-2da19.containers.snapdeploy.app/trails
```

#### 2. `POST`

```bash
curl -X POST https://3810-2da19.containers.snapdeploy.app/api/trails -H "Content-Type: application/json" -d "{\"trailName\":\"HKMU\",\"district\":\"Kowloon\",\"difficulty\":\"Easy\",\"distanceKm\":4.2,\"durationHrs\":1,\"meetingPoint\":\"Mong Kok MTR\",\"description\":\"Created via CURL\"}"
```

#### 3. `GET`

```bash
curl -X GET "https://3810-2da19.containers.snapdeploy.app/api/trails?q=HKMU"
```

#### 4. `PUT`

```bash
ID=$(curl -s "https://3810-2da19.containers.snapdeploy.app/api/trails?q=HKMU" | grep -o '"_id":"[^"]*"' | head -n 1 | cut -d'"' -f4) && \
```
```
curl -X PUT "https://3810-2da19.containers.snapdeploy.app/api/trails/$ID" -H "Content-Type: application/json" -d '{"difficulty":"Moderate","durationHours":2,"description":"Updated via CURL"}'
```

#### 5. `DELETE`

```bash
curl -X DELETE "https://3810-2da19.containers.snapdeploy.app/api/trails/$ID"
```

### Local Demo (Bash)

Start MongoDB and run `npm start`. Run the following blocks in order in the same Bash session.
If your app uses a different local port, update `BASE`.

#### 1. Login test

This checks that an unauthenticated request to `/trails` receives `302` with `Location: /login`.

```bash
BASE=http://127.0.0.1:3000 && curl -sS -I "$BASE/trails"
```

#### 2. `POST`

Create a temporary trail and save the ID from the response for the remaining steps.

```bash
TRAIL_ID= && RESPONSE=$(curl -fsS -X POST "$BASE/api/trails" -H 'Content-Type: application/json' -d '{"trailName":"Local Curl Demo","district":"Kowloon","difficulty":"Easy","distanceKm":4.2,"durationHrs":1,"meetingPoint":"Mong Kok MTR","description":"Temporary trail for the local API demo."}') && TRAIL_ID=$(node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).data._id' <<< "$RESPONSE") && printf '%s\n' "$RESPONSE"
```

#### 3. `GET`

```bash
curl -fsS "$BASE/api/trails/$TRAIL_ID"
```

#### 4. `PUT`

```bash
curl -fsS -X PUT "$BASE/api/trails/$TRAIL_ID" -H 'Content-Type: application/json' -d '{"difficulty":"Moderate","durationHrs":2}' && printf '\n' && curl -fsS "$BASE/api/trails/$TRAIL_ID"
```

#### 5. `DELETE`

Delete the temporary trail, then confirm a second lookup returns `404`.

```bash
curl -fsS -X DELETE "$BASE/api/trails/${TRAIL_ID:?Run the POST step first}" && printf '\n' && curl -sS -i "$BASE/api/trails/$TRAIL_ID"
```
