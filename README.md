# 5th Kajang BB Attendance

A phone-friendly attendance website for The 5th Kajang Boys' Brigade Company.

| File | What it is |
|---|---|
| `server.js` | The real website: a shared SQLite database and staff sign-in. No npm packages needed. |
| `app.html` | The whole front end. The server serves it, and it also runs on its own as a single-device demo that keeps data in browser storage. |
| `data/attendance.db` | The database. It is created on first run. **Back this file up.** |

## Run it

You need Node.js 22.13 or newer.

```bash
cd bb-attendance
```

```bash
ADMIN_USERNAME=captain ADMIN_PASSWORD='choose-a-strong-password' node server.js
```

Then open http://localhost:3000 and sign in. The first run creates that staff account and loads sample data. If you leave out `ADMIN_PASSWORD`, a random password is printed in the terminal.

To start with **no sample data**, delete `data/` and run once with `SEED_SAMPLE=0`.

### Add staff accounts

```bash
node server.js add-staff lt.grace 'her-password-here' "Lt. Grace Chin"
```

To reset a password, run `node server.js set-password <username> <new-password>`. The display name is recorded next to every attendance mark that person saves.

### Put it online for squad leaders (GitHub + Render)

GitHub stores the **code**. The attendance **data** lives in the database on the host's disk, and `.gitignore` keeps it out of GitHub so members' details are never published.

1. Push this folder to a GitHub repository (a private repository is fine).
2. On https://render.com choose **New → Blueprint**, then pick the repository. Render reads `render.yaml`.
3. When asked, enter `ADMIN_PASSWORD`. After it deploys, open the `https://…onrender.com` address and sign in as `captain`.
4. Give each squad leader their own login from the Render **Shell** tab:
   `node server.js add-staff leader.joel 'their-password' "Cpl Joel Fernandez"`
5. Send them the website address. Everyone sees the same records live.

Code changes pushed to GitHub redeploy automatically, and the data on the disk is kept. Use Render's disk snapshots, or download `attendance.db` now and then, as a backup.

### Deploy elsewhere

Run it on any host that keeps a persistent disk, such as a small VPS, Render, Railway or Fly.io with a volume. Put HTTPS in front of it with a reverse proxy or the platform's built-in TLS. Settings:

- `PORT` (default 3000)
- `DB_FILE` (default `./data/attendance.db`; point it at the persistent volume)
- `COOKIE_SECURE=1` when served over HTTPS (it is set automatically when the proxy sends `X-Forwarded-Proto: https`)

Serverless hosts with no persistent disk, such as Netlify functions, are not suitable for the SQLite file.

## Change the organisation name

- **In the app:** tap the gear icon at top right, edit **Organisation name**, then tap **Save name**.
- **Before first run:** set `ORG_NAME="..."`.

## Change the groups

- **In the app:** go to **Members**, then **Manage groups**. You can rename, reorder (↑ ↓), add or remove groups. A group that still has members or past sessions cannot be removed; move the members out first, or rename it.
- **Before first run, without sample data:** `SEED_SAMPLE=0 GROUPS="Primers,Juniors,Seniors" node server.js`.

## How it works

- Dates use Malaysia time (Asia/Kuala_Lumpur) and display as DD/MM/YYYY, whatever the phone's time zone is.
- Each session is a name, date, time, and one group or All groups. You can have more than one session on the same day.
- Everyone starts Unmarked. **Mark Remaining as Present** fills only the Unmarked members. Tap a selected status again to clear it.
- There is one record per member per session (a database primary key). Saving again updates that record and does not create a duplicate. Open any past session to correct it.
- Archiving a member hides them from new sessions but keeps all their past records.
- Attendance rate = (Present + Late) ÷ (Present + Late + Absent) × 100. Excused and Unmarked are shown separately.
- Report filters use each member's current group. The CSV export follows the filters on screen.
- Theme (light or dark) and colour are per device, under the gear icon.
