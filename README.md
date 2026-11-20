# The 5th Kajang Boys' Brigade: website and Parade HQ

Two parts, one free setup (**GitHub Pages** for hosting, **Firebase** Spark plan for data and sign-in, no credit card):

| Part | Address | Who |
|---|---|---|
| **Public website** | `https://bryan0706.github.io/5thkjbbattendances/` | Everyone: parents, members, the church, new families |
| **Parade HQ** (attendance) | `…/5thkjbbattendances/attendance/` | Staff only, username and password |

Until `firebase-config.js` is filled in, both run as a preview: the website shows the six past events from the old Wix site plus two upcoming events marked "Example", and Parade HQ runs as a single-device demo with invented names (Settings → "Preview as" lets you try each duty).

## Public website

Home page sections: hero, About us, What we do (activities and the Pre-Junior, Junior and Senior sections), **What's coming up**, **Past events & camps** (with photo details), **Our team**, **Join us** (with a "Register your interest" form for recruitment) and **Contact us**. It has a light/dark switch and theme colours in the footer, and a **Staff sign in** button that opens Parade HQ.

Staff manage it from Parade HQ (Owner and Admin):

- **Website → New post**: title, Event / Camp / News, date (and end date), time, place, summary, description, cover photo (taken straight from a phone; it is shrunk in the browser before saving), Published or Draft. Future dates show under "What's coming up"; once the date passes they move to "Past events & camps" automatically.
- **Website → Import the 6 events from the old website**: copies the old Wix events in so you can edit them.
- **Website → Site details**: meeting time, venue, map search words, email, phone/WhatsApp, Instagram, Facebook, recruitment note and the Join us paragraph.
- **Enquiries**: every form sent from the website, with WhatsApp and email buttons. Mark each as Contacted or Closed.

Photos from the old site are in `img/` (events, team, site). To change the team list or the activity cards, edit `TEAM` and `ACTIVITIES` near the top of the script in `site.html`, then run `node build.js`.

The form keeps out bots with a hidden field, and the database rules accept only the expected fields and sizes. Parents' details can only be read by Owner and Admin.

## Parade HQ sections

| Section | Who | What it does |
|---|---|---|
| Command | everyone | Today's parade at a glance: rings for Officers, Primers, Helper and Members, squad formation %, squad award (Present = 1, Late = ½, Excused left out). Owner/Admin can **dismiss** a parade, set a date as **parade off** with a reason, and download the Excel report. |
| Parade Desk | Owner, Admin, Parade Commander | Mark officers, primers and helpers: Present, Late, Absent, Excused, or clear. All Present / All Absent fill only people still unmarked; Revoke All clears. |
| Members | Owner, Admin, Squad Leaders | Mark member squads. A Squad Leader sees only their own squad. |
| Set Marks | Owner, Admin | Mark many people across many dates at once. "Add range" adds Saturdays only. Parade-off dates are skipped. |
| Report | everyone | Official report for a parade date: posted, on parade, each status and strength % by section and squad, plus the nominal roll. **Download Excel**. |
| Year Record | everyone | One person's year, month by month, with attendance %. |
| Calendar | everyone | Month view. Green days had a parade (strength shown), grey days were parade off. |
| Changes | Owner, Admin | Every mark change: who, when, old → new. Entries cannot be edited or deleted. |
| Roster | Owner (Admin can view) | Officers, Primers, Helper, Squads 1–4. Add, edit, drop, arrange order, squad leader tag, active on the roll, **Import CSV**. |
| Members Data | Owner, Admin | Personal register: names (English and Chinese), section, rank, age, contacts, school, address, emergency contact, awards. |
| Community Services | Owner, Admin, Community Services | Services with a sign-in sheet and hours, badge tracker (Basics 15 h, Advanced 25 h), groups, reports. |
| Staff | Owner | Issue logins with a duty, rename, revoke or reinstate, set the Owner recovery key. |
| Website | Owner, Admin | Posts for the public site (events, camps, news) and site details. |
| Enquiries | Owner, Admin | Recruitment form messages from the public site. |

Attendance % = (Present + Late) ÷ (Present + Late + Absent) × 100. Excused and Unmarked are shown separately. Dates use Malaysia time and show as DD/MM/YYYY.

## Firebase setup (one time, free)

You already created the project `thkjbb-attendance`, the Firestore database and the web app. `firebase-config.js` is filled in. Two more steps:

1. **Turn on username sign-in.** Firebase console → **Authentication → Sign-in method → Add new provider → Email/Password → Enable** (leave "Email link" off) → **Save**. You can disable the Google provider; it is no longer used.
2. **Publish the rules.** **Firestore Database → Rules**, replace everything with the contents of [`firestore.rules`](firestore.rules), then **Publish**. Do this again whenever `firestore.rules` changes (it changed when the public website was added). (You can delete the old `config/staff` document; it is no longer used.)

Then open Parade HQ at `…/attendance/`. Because no Owner exists yet, it shows **First-time setup**: choose the Owner username and password. **Do this straight away**, before sharing the link: the first person to complete setup becomes the Owner.

After that, as the Owner:

1. **Roster → Import CSV** to load your roster (columns: `Name, Section, Rank, Squad, Squad leader`).
2. **Staff → Issue a post** for each officer and squad leader (display name, username, password, duty, squad).
3. **Staff → Owner recovery key**: set one and keep it safe.

Usernames become fake email addresses (`username@staff.5thkj.app`) inside Firebase; nobody receives email.

### Passwords

Anyone can change their own password under **Settings → Change my password**. The free plan does not let the Owner reset another person's password; instead revoke the old post and issue a new username. If the Owner forgets their password, use **Forgot Owner password?** on the sign-in page with the recovery key: it creates a new Owner login and revokes the old one.

## GitHub Pages

The repository must be **public** for free GitHub Pages. That is safe: the code holds no member data, and the Firebase config is meant to be public. The rules decide who can read records.

**Settings → Pages → Deploy from a branch → `main` / root → Save.** The site appears at `https://bryan0706.github.io/5thkjbbattendances/`. Add `bryan0706.github.io` to Firebase **Authentication → Settings → Authorized domains**.

Never commit roster files or exports (they contain children's names). `.gitignore` blocks `*.csv` and `*.xlsx`.

## Changing things

- **Organisation name, short code, year established:** Settings (gear) as Owner.
- **Squads, sections, ranks, awards:** edit the constants near the top of the main script in `app.html` (`GROUP_LABEL`, `RANKS`, `AWARDS`), and the matching names in `firestore.rules` if you add squads.
- **The pages themselves:** edit `site.html` (public website) or `app.html` (Parade HQ), run `node build.js` to regenerate `index.html` and `attendance/index.html`, then commit and push. Records in Firebase are not affected.

## Free-plan limits

Spark allows 50,000 reads and 20,000 writes a day and 1 GB of storage. Each mark is about 2 small writes; opening the app reads roughly one document per person and per parade. A company of 60–70 with weekly parades uses a few percent at most. If a limit is ever reached, Firebase pauses until the next day; it never charges you on Spark.

## Backups

Download the Excel report after each parade, or export from the Report page now and then.
