# TrailMate HK

## 1. Project info

TrailMate HK is a hiking guide and meetup board for Hong Kong. Find a route by district, difficulty or distance, check how to get there, and save a route or join a group hike. The forum is for questions and trip reports.

This is a COMP 3810SEF Autumn 2026 group project built with Express, MongoDB (through Mongoose), and EJS. The local demo starts with six routes and four sample forum posts. Trail status, meetup dates and transport details are sample data. Check current information with [AFCD](https://www.hiking.gov.hk/), the [Hong Kong Observatory](https://www.hko.gov.hk/) and transport operators before a trip.

## 2. Group info

Group number `___`

| Member | Name | Student ID | Work contributed |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5, if applicable | | | |
| 6, if applicable | | | |

Fill in this table in the course submission copy. Name the folder and ZIP `comp3810sef_group<No>`. Leave out `node_modules` and `.env`.

## 3. Project files

| File | What it does |
| --- | --- |
| `server.js` | Starts Express, opens MongoDB, and handles login, trails, forum posts and the JSON API. |
| `package.json` and `package-lock.json` | Define commands and dependencies. EJS renders pages, Mongoose reads and writes MongoDB, express-session handles logins, bcryptjs hashes passwords, and dotenv reads `.env`. Nodemon restarts the server during `npm run dev`. |
| `models/` | Defines `User`, `Trail` and `ForumPost` records. |
| `views/` | Holds sign-in, registration, route list, route detail, create/edit and forum pages. |
| `public/` | Holds CSS, the language dictionary and scripts for theme, filters and form controls. |

## 4. Run and try the app

### Start locally

1. Start MongoDB on `127.0.0.1:27017`. To use a different database, copy `.env.example` to `.env` and set `MONGODB_URI`.
2. From the project directory, run `npm ci` and `npm start`.
3. Open `http://127.0.0.1:3000/login`. Use `admin` or `hiker1` with password `password123`, or register your own account.

The demo adds records to empty collections on startup. Use a separate database name to try a fresh set and keep existing records. For example, set `MONGODB_URI=mongodb://127.0.0.1:27017/trailmate_demo` in `.env`.

The default server listens on the local machine. Use this mode for the course's anonymous `curl` examples. Binding to a non-loopback `HOST` or setting `NODE_ENV=production` requires a private `SESSION_SECRET` of at least 32 characters, disables demo seeding and requires a sign-in for API writes. Production cookies require HTTPS, for example through a reverse proxy on the same machine. The session store is in memory, so signing in again is required after a restart.

### Try the pages

1. Sign in and choose a district. Filter by keyword or difficulty, open a trail by its name, and try **Save** or **Join Hike**. The saved list is in the sidebar.
2. Choose **Add Trail** to enter a route. On a route you added, use **Edit** and **Delete**. The admin demo account can also manage routes added by other users.
3. Open **Hiking Forum** to filter posts by topic or date, publish a post, leave a reply or star a post. Forum dates use Hong Kong time. Authors and admins can delete their posts.
4. Use the language menu for English, 繁體中文 or 简体中文 interface labels. The sun/moon button changes the theme. Choose **Log Out** when done.

### JSON API

The table uses `:id` for a record ID. All examples below use the local demo.

| Method | Path | Use |
| --- | --- | --- |
| GET | `/api/trails` | List routes. Accepts `district`, `difficulty`, `status`, `maxDistance`, `q` and `sort`. |
| GET | `/api/trails/:id` | Read one route. |
| POST | `/api/trails` | Add a route. |
| PUT | `/api/trails/:id` | Update a route. Send the fields you want to change. |
| DELETE | `/api/trails/:id` | Delete a route. |
| GET | `/api/forum` | List posts. Accepts `category`, `trail`, `q`, `dateFrom` and `dateTo` (YYYY-MM-DD). |
| POST | `/api/forum` | Publish a post. |
| PUT | `/api/forum/:id` | Update a post. |
| DELETE | `/api/forum/:id` | Delete a post. |
| GET | `/api/stats` | Count routes and posts and list route totals by district. |

Run these in Bash. For the last two route commands, copy `data._id` from the create response.

```bash
base=http://127.0.0.1:3000

curl -sS "$base/api/trails?district=New%20Territories&difficulty=Moderate"

curl -sS -X POST "$base/api/trails" -H 'Content-Type: application/json' \
  -d '{"trailName":"Demo walk","district":"Kowloon","difficulty":"Easy","distanceKm":3,"durationHrs":1.5,"meetingPoint":"Lok Fu MTR","description":"Temporary route for the CRUD demo."}'

trail_id='<paste data._id from the create response>'
curl -sS -X PUT "$base/api/trails/$trail_id" -H 'Content-Type: application/json' \
  -d '{"maxParticipants":10}'
curl -sS -X DELETE "$base/api/trails/$trail_id"

curl -sS "$base/api/forum?dateFrom=2026-11-20&dateTo=2026-11-30"
curl -sS -X POST "$base/api/forum" -H 'Content-Type: application/json' \
  -d '{"title":"Demo post","content":"Temporary post for the CRUD demo."}'

post_id='<paste data._id from the create response>'
curl -sS -X PUT "$base/api/forum/$post_id" -H 'Content-Type: application/json' \
  -d '{"title":"Updated demo post"}'
curl -sS -X DELETE "$base/api/forum/$post_id"
curl -sS "$base/api/stats"
```
