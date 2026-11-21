# The 5th Kajang Boys' Brigade: website and Parade HQ

Two parts, one free setup (**GitHub Pages** for hosting, **Firebase** Spark plan for data and sign-in, no credit card):

| Part | Address | Who |
|---|---|---|
| **Public website** | `https://5thkajangbbattendance.github.io/` | Everyone: parents, members, the church, new families |
| **Uniform order** | `https://5thkajangbbattendance.github.io/uniform/` | Parents and members ordering uniform parts |
| **Parade HQ** (attendance) | `https://5thkajangbbattendance.github.io/attendance/` | Staff only, username and password |

Until `firebase-config.js` is filled in, both run as a preview: the website shows the six past events from the old Wix site plus two upcoming events marked "Example", and Parade HQ runs as a single-device demo with invented names (Settings → "Preview as" lets you try each duty).

## Public website

Home page sections: hero, About us, What we do (activities and the Pre-Junior, Junior and Senior sections), **What's coming up**, **Past events & camps** (with photo details), **Our team**, **Join us** (with a "Register your interest" form for recruitment) and **Contact us**. The menu, Join us and footer link to the separate **Uniform order** page (`/uniform/`). It has a light/dark switch and theme colours in the footer, and a **Staff sign in** button that opens Parade HQ.

Staff manage it from Parade HQ (Owner and Admin):

- **Website → New post**: title, Event / Camp / News, date (and end date), time, place, summary, description, cover photo (taken straight from a phone; it is shrunk in the browser before saving), Published or Draft. Future dates show under "What's coming up"; once the date passes they move to "Past events & camps" automatically.
- **Website → Import the 6 events from the old website**: copies the old Wix events in so you can edit them.
- **Website → Our team**: add, edit (name, role, photo from your phone), remove and reorder the people under "Our team" on the public site. Until you add anyone, the site shows the seven officers from the old Wix site; **Import the 7 officers** copies them in so you can edit them.
- **Website → Site details**: meeting time, venue, map search words, email, phone/WhatsApp, Instagram, Facebook, recruitment note and the Join us paragraph.
- **Uniform order page** (`/uniform/`, built from `uniform.html`): four steps on one screen at a time: 1 Section (Pre-Junior, Junior or Senior), 2 Parts (sizes, quantities, size charts, running total in the bottom bar), 3 Details (Existing member with name and squad, or New member with name and age, plus parent and phone), 4 Review and send. Parents get an order number such as `U-7KQ3M`. If saving fails, they can send the same order on WhatsApp or by email.
- **Website → Uniform items**: change prices, sizes, the details parents must type (shoe size, name on the tag…), size charts and stock ("Out of stock"), or add, remove and reorder parts. Each part can have a photo (otherwise an icon is shown) and can be hidden with **Show on the website**. Until you press **Load the current price list**, the page shows the built-in list (20 parts; the new Senior Brigade Tee is hidden until you set its price). **Website → Site details → Uniform payment instructions** is shown with the form and on the thank-you message; put bank or DuitNow details there.
- **Payment methods** (Website → Payment): add, edit, hide, reorder or remove the ways parents can pay (type, name, details and an optional QR code). Parents choose one on the Uniform page's review step; after sending they see the amount, their order number as the reference, and the QR (with **Save QR to my phone**) or instructions. Starts with Touch 'n Go eWallet (DuitNow QR, `img/uniform/payment-qr-tng.png`, cropped so no name shows) and Cash. Each method can name who receives payment proof (name and WhatsApp number); parents then get a **Send payment proof** button with the order number and amount filled in (without one, the first WhatsApp officer or the main number is used). The order page and the Excel file show **Pays by**. Uploaded QR codes are kept as sharp PNGs so they still scan.
- **WhatsApp officers** (Website → Site details): add up to 8 officers with name, role and WhatsApp number. When uniform ordering is closed, parents see them as cards and choose who to message (the message is pre-filled). With no officers listed, the page uses the main Phone / WhatsApp number.
- **Ordering rounds** (top of Uniform orders): **Close orders** with a message parents see on the Uniform page instead of the form; **Open a new round** (or **Start a new round** while open) with a name, an optional message and an optional automatic closing date and time (Malaysia time); **Reopen** the last round; **Change closing time**. Each round has its own order list, so orders from different rounds never mix; choose the round under *Showing orders from* (or *Before rounds* for orders sent before rounds were set up, or *All rounds*). Totals, Parts to prepare and the Excel download follow the chosen round. **Round history** shows every open, close and reopen with who did it and why. The database refuses new orders while ordering is closed or after the closing time.
- **Uniform orders**: every order, with status New → Paid → Ready → Collected (or Cancelled), a WhatsApp button, a **Parts to prepare** total for new and paid orders (for ordering from the supplier), and **Download Excel** (an .xlsx file: Orders, one row per order with each order number linking to its sheet; To prepare, totals by part and size; then one sheet per order, named by its order number, with the order, member, parent, parts table, total and notes). New orders show a red badge, a banner on the overview and pop-up alerts, like enquiries. Prices are saved with each order, so changing a price later does not change old orders.
- **Enquiries**: every form sent from the website, with WhatsApp and email buttons. Mark each as Contacted or Closed. New enquiries show a red badge on the Enquiries menu and a banner on the overview for Owner and Admin, and pop up while Parade HQ is open (tap **Turn on alerts** on the Enquiries page for desktop/phone pop-ups).
- **Email copies (off by default)**: enquiries are kept in Parade HQ → Enquiries. If you ever want an email copy too, enter an address under **Website → Site details → Email copy of enquiries**; it is sent through the free FormSubmit relay, which needs a one-time **Activate Form** click in that inbox. If saving fails, the visitor is offered WhatsApp and email links instead.

Photos from the old site are in `img/` (events, team, site). To change the activity cards, edit `ACTIVITIES` near the top of the script in `site.html`, then run `node build.js`. The team list is managed in Parade HQ (Website → Our team).

The form keeps out bots with a hidden field, and the database rules accept only the expected fields and sizes. Parents' details can only be read by Owner and Admin.

## Parade HQ sections and duties

Each login has one duty, set by the Owner under **Staff**. What each duty can see and do (enforced by both the app and `firestore.rules`):

| Duty | Sees | Can change |
|---|---|---|
| **Owner** | Everything | Everything, including issuing logins, changing anyone's username and password, duties and the recovery key |
| **Admin** | Everything (Staff page read-only) | Everything else: all squads, roster, records, Members Data, Community Services, website, enquiries |
| **Parade Commander** | Overview and Calendar for officers, primers and helpers only | Marks officers, primers and helpers on open parades |
| **Squad Leader** | Overview and Calendar for their own squad only | Marks their own squad on open parades |
| **Community Services** | Community Services only (cannot read attendance) | Services, hours, badges, groups |
| **Website** | Website, Enquiries and Uniform orders only (cannot read attendance, members or community services) | Posts, team, uniform items, site details, enquiries, uniform orders |

| Section | What it does |
|---|---|
| Command | Parade overview for what you may see: on the roll, on parade, still to mark, attendance rate, status bar, strength trend, formation. Owner/Admin also get the squad award, **dismiss**, and **parade off**. |
| Parade Desk | Mark officers, primers and helpers. All Present / All Absent fill only people still unmarked; Revoke All clears. |
| Members | Mark member squads. A Squad Leader sees only their own squad. |
| Set Marks | Owner/Admin: many people across many dates. "Add range" adds Saturdays only. Parade-off dates are skipped. |
| Report | Owner/Admin: official report for a parade date. **Download Excel**. |
| Year Record | Owner/Admin: one person's year, month by month. |
| Calendar | Month view with strength per parade day. |
| Changes | Owner/Admin: every mark change, who and when. Cannot be edited. |
| Roster | Owner/Admin: add, edit, drop, arrange, **Import CSV**. |
| Members Data | Owner/Admin: personal register and awards. |
| Community Services | Services with sign-in sheets, badge hours (Basics 15 h, Advanced 25 h), groups, reports. |
| Staff | Owner issues logins, sets duties, and changes anyone's username and password (**Change username / password**). Admin can view the board. Only the Owner can change their own password (Settings). |
| Website / Enquiries / Uniform orders | Owner/Admin/Website: public website posts, team, uniform price list, site details, recruitment form inbox and uniform orders. |

Squad Leaders and the Parade Commander technically download the whole attendance list in the background (the screens only show their own scope), so a determined person with browser developer tools could still read other squads' marks. Community Services logins cannot read attendance at all.

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

Only the Owner sets usernames and passwords. On the Staff page, **Change username / password** gives that person a fresh login with the new details; the old login stops working at once, and their name, duty and past marks stay. (Firebase's free plan cannot edit another person's password directly, so the app swaps in a new login. Old, unused logins remain listed under Firebase → Authentication → Users and can be deleted there if you like.)


If the Owner forgets their password, use **Forgot Owner password?** on the sign-in page with the recovery key: it creates a new Owner login and revokes the old one.

## GitHub Pages

The repository must be **public** for free GitHub Pages. That is safe: the code holds no member data, and the Firebase config is meant to be public. The rules decide who can read records.

**Settings → Pages → Deploy from a branch → `main` / root → Save.** The repository is named `5thkajangbbattendance.github.io` in the `5thkajangbbattendance` organization, so the site appears at `https://5thkajangbbattendance.github.io/`. Add `5thkajangbbattendance.github.io` to Firebase **Authentication → Settings → Authorized domains**.

Never commit roster files or exports (they contain children's names). `.gitignore` blocks `*.csv` and `*.xlsx`.

## Changing things

- **Organisation name, short code, year established:** Settings (gear) as Owner.
- **Squads, sections, ranks, awards:** edit the constants near the top of the main script in `app.html` (`GROUP_LABEL`, `RANKS`, `AWARDS`), and the matching names in `firestore.rules` if you add squads.
- **The pages themselves:** edit `site.html` (public website) or `app.html` (Parade HQ), run `node build.js` to regenerate `index.html` and `attendance/index.html`, then commit and push. Records in Firebase are not affected.

## Free-plan limits

Spark allows 50,000 reads and 20,000 writes a day and 1 GB of storage. Each mark is about 2 small writes; opening the app reads roughly one document per person and per parade. A company of 60–70 with weekly parades uses a few percent at most. If a limit is ever reached, Firebase pauses until the next day; it never charges you on Spark.

## Backups

Download the Excel report after each parade, or export from the Report page now and then.
