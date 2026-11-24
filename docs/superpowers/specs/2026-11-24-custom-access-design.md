# Roles and permissions (Discord-style): design

## Why

Today each login gets one of seven fixed duties, and each duty's access is written into both Parade HQ and `firestore.rules`. When someone needs a mix of access, the only option is a bigger duty that gives too much. The Owner wants roles like Discord's:

- The Owner creates and names roles.
- Each role has its own permissions for each area.
- A login can hold several roles and gets everything they add up to.

## Goals

- The Owner creates, names, colours, edits and deletes roles.
- Each role sets **See** or **Change** separately for each area. For attendance, it also sets which groups it can see or mark.
- A login holds any number of roles, and its access is everything its roles give together.
- An **Everyone** role (like Discord's @everyone) gives a baseline to every login. It starts with nothing.
- The database rules enforce it, not just the menu.
- On the day it goes live, nobody's access changes: today's duties become starting roles.

## Non-goals

These are my calls and can be added later:

- Letting anyone other than the Owner manage roles. Discord's "Manage roles" permission and role order are left out for now.
- "Deny" overrides. Roles only add access, never take it away.
- Per-login permissions outside roles. To give one person something, make a role for it.

## Anti-goals

- Locking the Owner out. The Owner always has everything, with or without roles.
- Anyone gaining or losing access during the switch-over.
- The menu showing one thing while the database allows another.

## Approaches considered

| | Approach | Verdict |
|---|---|---|
| A | Fixed duty plus per-login ticks | Superseded: the Owner prefers roles that stack |
| **B (chosen)** | Roles that stack, with See or Change per area | Most Discord-like; one person can mix roles |
| | Simpler B: on or off per area | Rejected: anyone who can see an area could also change it |

**Making the rules work:** the database rules can't add up a list of roles on the fly; they can only fetch a few documents and can't loop. So whenever the Owner changes a role or someone's roles, Parade HQ:

1. Works out each affected login's combined access.
2. Saves that combined access onto the login's staff record, in the same save as the role change, so the two are all saved together or not at all.

The rules then read only the staff record. The alternative, having the rules fetch each role, would cap logins at a few roles and add a database read to every check, so it doesn't fit.

## Permissions a role can give

| Area (the "channels") | Choices | Notes |
|---|---|---|
| **Attendance, per group**: Officers, Primers, Helper, Squad 1–4 (built as seven separate groups, so roles can be finer) | — · See · Mark | Home overview, Parade Desk, Members list and Calendar show the groups the login can see; marking is allowed on open parades for groups it can mark |
| **Run parades** | — · Change | Open, close and dismiss parades, correct after dismissal, Set Marks, edit the calendar |
| **Reports & year record** | — · See | Report and Year Record pages, Excel and print |
| **Roster & members data** | — · See · Change | Roster, Members Data, register |
| **Change record** | — · See | |
| **Community Services** | — · See · Change | |
| **Website** (posts, team, site details) | — · See · Change | |
| **Notice board & forms** | — · See · Change | Includes form responses |
| **Enquiries** | — · See · Change | |
| **Uniform orders** | — · See · Change | Orders, payment proof, collection checklist and photos |
| **Uniform setup** (items, prices, rounds, Uniform page header, payment methods) | — · Change | |
| **Photo storage settings** | — · Change | Google Drive link |
| **Inventory** | — · See · Change · Change + import CSV · Manage (import + Google Sheet) | |
| **Staff board** | — · See | Staff page, read-only |

"Change" always includes "See". Owner-only, never in a role: making logins, usernames, passwords, the recovery key, managing roles, and the colour accent.

**One limit to know.** Each parade is stored as one record holding every group's marks, so the database can't show part of it. Anyone who can see any attendance group can technically read that day's whole parade, just as Squad Leaders can today. The screens show only their groups, and marking is fully limited to the groups they can mark.

### Starting roles (identical to today's duties)

| Role | Gives |
|---|---|
| Admin | Everything above at its highest level |
| Parade Commander | Officers & primers & helpers: Mark; Inventory: Change |
| Squad 1 Leader … Squad 4 Leader | Their squad: Mark; Inventory: Change |
| Community Services | Community Services: Change |
| Website | Website, Notice board & forms, Enquiries, Uniform orders, Uniform setup: Change |
| Uniform | Uniform orders, Uniform setup: Change; Inventory: Change + import CSV |
| Everyone | Nothing |

Each existing login gets the role matching its duty. A Squad Leader gets the role for their squad.

## How it works

**Stored data.**
- `roles/{id}`: `{name, color, perms: {area: 'see'|'change'|...}, groups: {sq1: 'see'|'mark', ...}, order, createdAt}`, plus `roles/everyone`.
- Staff records gain `roles: [ids]` and `access`, the combined result: `{read: [areas], write: [areas], see: [groups], mark: [groups], inv: level}`.
- The old `duty` and `squad` fields stay so older code and the switch-over keep working. They are no longer shown.

**Rules.**
- One helper reads `access` from the staff record. With no `access` field, it falls back to a table of today's duty defaults written in the rules, so nothing breaks before the switch-over.
- Every existing check (`isAdmin`, `canWeb`, `canUni`, `canCS`, `canInv`, `notWeb`, `markable`) is rewritten in terms of read/write areas and mark groups.
- The Owner short-circuits to everything.
- `roles` can be read by any posted login, so role chips show, and written only by the Owner. Staff records are already Owner-only.

**Switch-over.** The first time the Owner opens Parade HQ after the update, it offers **Set up roles**. That creates the starting roles and gives each login its role in one save. Until then, everything runs on duties exactly as today.

**Parade HQ screens.**
- *Staff page → Roles tab (Owner):*
  - A list of roles with colour, name and member count.
  - Editing a role shows its permission grid (one row per area, with its choices) and its members.
  - New role, Delete role (Parade HQ asks first and says who loses what), and Duplicate role.
- *Staff page → each login:* coloured role chips like Discord, *Add role* and remove (×), plus a "Can open" summary of the combined access.
- *New login form:* choose one or more roles.
- *Every page:* follows See/Change. Without Change, a page is read-only: edit buttons are hidden and a "View only" note shows, using the pattern the Roster page already has.
- *Menu and start page:* show only pages the login can see. The start page is the first of them.
- *Demo:* "Preview as" uses each login's roles.
- *Change record:* (as built) role docs record who last changed them (`updatedBy`, `updatedAt`), and staff records record who last changed their roles (`rolesBy`, `rolesAt`); the Changes page stays a record of marks.
- *Inventory app:* reads the same `access` for its import and Google Sheet controls.
- *Drive photo script:* needs no change; it already follows the rules through the officer's own sign-in.

## Rollout

Publish the new `firestore.rules`, then open Parade HQ as Owner and press **Set up roles**. The guide and the Staff page say so.

## Left to the builder

- Exact layout of the Roles tab and permission grid, in the app's existing style, working on phones, in both themes.
- The colour choices for roles: a fixed palette that reads well in light and dark.
- Tests:
  - Rules emulator tests showing every starting role matches today's suites; the existing 49- and 117-check suites must still pass for duty-only logins.
  - Stacked-role cases.
  - See-without-Change cases.
  - Browser tests for the Roles tab, role chips, read-only pages and the menu.
