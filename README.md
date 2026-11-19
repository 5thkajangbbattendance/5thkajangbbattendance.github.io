# 5th Kajang BB Attendance

A phone-friendly attendance website for The 5th Kajang Boys' Brigade Company.

**Free to run:** GitHub Pages hosts the website, and Firebase (Google's free Spark plan, no credit card) keeps the records and handles sign-in. Squad leaders sign in with their Google account, and only emails on your staff list can see or change anything.

| File | What it is |
|---|---|
| `app.html` | The whole app. Edit this one. |
| `index.html` | The page GitHub Pages serves. Generated from `app.html` by `node build.js`; don't edit it by hand. |
| `firebase-config.js` | Your Firebase project's web settings. |
| `firestore.rules` | Database security rules: staff-list emails only. |
| `server.js` | Optional: run your own server instead of Firebase (see the end). |

Until `firebase-config.js` is filled in, the website runs as a **single-device demo** with sample data stored in the browser.

---

## Set up (one time, about 15 minutes, free)

### 1. Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with the Google account that will own the records.
2. Click **Create a project** and name it something like `5thkjbb-attendance`. You can turn Google Analytics off. It stays on the free **Spark** plan; never click "Upgrade".
3. **Build → Authentication → Get started → Sign-in method → Google → Enable**. Choose a support email, then click **Save**.
4. **Build → Firestore Database → Create database**. Pick location `asia-southeast1 (Singapore)` and start in **production mode**.
5. In Firestore, open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.

### 2. Add the staff list

In **Firestore Database → Data**:

1. Click **Start collection**. Collection ID: `config`, Document ID: `staff`.
2. Add a field named `emails` of type **array**. Add one string per person, in **lowercase**, for example `captain.gmail@gmail.com` and `squadleader.joel@gmail.com`.
3. Click **Save**.

To add or remove a squad leader later, edit this `emails` array. Nobody can change the staff list from the website.

### 3. Connect the website to Firebase

1. In Firebase, click the gear icon, then **Project settings → General → Your apps → Web (`</>`)**. Register an app (any nickname, no hosting needed).
2. Copy the `apiKey`, `authDomain`, `projectId` and `appId` values into `firebase-config.js`, then commit and push. You can edit the file directly on github.com with the pencil icon.

### 4. Turn on GitHub Pages

1. The repository must be **public** for free GitHub Pages. That is safe: the code contains no member data, and Firebase config values are designed to be public. The rules decide who can read the records.
2. On GitHub, go to **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch **main**, folder **/ (root)**. Click **Save**.
3. After a minute the site is live at `https://<your-github-username>.github.io/5thkjbbattendances/`.
4. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** and enter `<your-github-username>.github.io`.

### 5. Use it

Open the site and tap **Sign in with Google**. The first staff sign-in creates the organisation name and the groups Pre-Junior, Junior and Senior. Add your members under **Members**, then send the link to your squad leaders. Everyone sees the same records, and each saved mark shows who saved it.

**Tip:** on a phone, use "Add to Home Screen" so it opens like an app.

---

## Change the organisation name

Tap the gear icon at top right, edit **Organisation name**, then tap **Save name**. Everyone sees the new name.

## Change the groups

Go to **Members → Manage groups**. You can rename, reorder (↑ ↓), add or remove groups. A group that still has members or past sessions cannot be removed; move the members out first, or rename it.

## Change the app

Edit `app.html`, run `node build.js` to regenerate `index.html`, then commit and push. GitHub Pages updates in about a minute. Records in Firebase are not affected.

## Free-plan limits

Firebase Spark allows 50,000 document reads and 20,000 writes per day, plus 1 GB of storage. Opening the app reads about one document per member and per session, and saving a session is one small write. A company with 50 members and weekly parades uses well under 1% of that. If a limit is ever reached, Firebase pauses until the next day; it never charges you on Spark.

## How it works

- Dates use Malaysia time (Asia/Kuala_Lumpur) and display as DD/MM/YYYY, whatever the phone's time zone is.
- Each session is a name, date, time, and one group or All groups. You can have more than one session on the same day.
- Everyone starts Unmarked. **Mark Remaining as Present** fills only the Unmarked members. Tap a selected status again to clear it.
- Each session stores one record per member. Saving again updates that record and does not create a duplicate. Two leaders saving the same session only overwrite the members each of them changed. Open any past session to correct it.
- Archiving a member hides them from new sessions but keeps all their past records.
- Attendance rate = (Present + Late) ÷ (Present + Late + Absent) × 100. Excused and Unmarked are shown separately.
- Report filters use each member's current group. The CSV export follows the filters on screen.
- Theme (light or dark) and colour are per device, under the gear icon.

## Back up the records

The easiest free backup is the **Reports** page: set a wide date range, then tap **Export CSV** now and then.

---

## Optional: run your own server instead

`server.js` runs the same app with a SQLite file and username/password sign-in, for anyone with their own always-on computer or server (Node.js 22.13+):

```bash
ADMIN_USERNAME=captain ADMIN_PASSWORD='choose-a-strong-password' node server.js
```

Then open http://localhost:3000. Add staff with `node server.js add-staff <username> '<password>' "Display Name"`. The database is `data/attendance.db`; it is git-ignored, so never commit it.
