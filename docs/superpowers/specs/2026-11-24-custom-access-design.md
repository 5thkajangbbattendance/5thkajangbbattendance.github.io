# Custom access per account: design

## Why

Today each login gets one of seven fixed duties, and each duty's access is written into both Parade HQ and `firestore.rules`. When someone needs a mix of access (for example, a Uniform login that also posts notices), the only option is a bigger duty that gives too much. The Owner wants to choose, account by account, what each login can open.

## Goals

- The Owner can tick or untick each area of Parade HQ separately for each account.
- The database rules enforce the ticks, not just the menu. An unticked area can't be read or changed, even by someone poking at the database directly.
- Picking a duty still works as a quick start: it fills in that duty's usual ticks, which the Owner can then change.
- Existing logins keep exactly the access they have today until the Owner changes them.

## Non-goals

- View-only versions of each area. Each area is either on or off, except Attendance and Inventory, which have levels (below). *My call: keeps the rules and screens simple. It can be added later.*
- Named custom duties (option C). Option A was chosen.
- Changing what the public website, notice board, forms or uniform page show to parents.

## Anti-goals

These would make it a failure even if it works:

- Locking the Owner out. The Owner account always has everything and its access can't be edited.
- Any login other than the Owner being able to change access, its own or anyone else's.
- Existing accounts losing or gaining anything when the new rules are published.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Duty fills in default ticks; the Owner adjusts per account | Quick for normal accounts, flexible for odd ones |
| B | Fully custom, every box ticked by hand | Every new login needs 10+ ticks; easy to forget one; squad limits need extra settings |
| C | Owner-made named duties | Good for groups, but one person's change needs a new duty |

## Areas you can set

| Area | Choices | What it opens |
|---|---|---|
| **Attendance** | No access · Mark own squad (choose squad) · Mark officers, primers & helpers · Every squad (full control) | Home overview, Parade Desk, Members and Calendar for its scope. *Every squad* also opens Set Marks, Report and Year Record, and lets the account open, close and correct parades. |
| **Roster & members data** | on/off | Roster, Members Data, register |
| **Change record** | on/off | Changes page |
| **Community Services** | on/off | Services, hours, badges, groups |
| **Website** | on/off | Website page: posts, team, site details |
| **Notice board & forms** | on/off | Notices, Forms and form responses |
| **Enquiries** | on/off | Recruitment enquiries |
| **Uniform orders** | on/off | Orders, rounds, uniform items, Uniform page header, payment methods (Uniform setup page when Website is off) |
| **Photo storage settings** | on/off | Connect, change or disconnect the Google Drive link |
| **Inventory** | No access · Use (see and change stock) · Use + import CSV · Manage (import + Google Sheet) | Inventory page and app |
| **Staff board** | on/off | See the Staff page (read-only) |

Owner-only, never tickable: making logins, passwords, usernames, the recovery key, changing anyone's access, and the colour accent.

### Default ticks per duty (identical to today's access)

| Duty | Attendance | Inventory | Ticked areas |
|---|---|---|---|
| Admin | Every squad | Manage | All areas |
| Parade Commander | Officers, primers & helpers | Use | — |
| Squad Leader | Own squad | Use | — |
| Community Services | No access | No access | Community Services |
| Website | No access | No access | Website, Notice board & forms, Enquiries, Uniform orders |
| Uniform | No access | Use + import CSV | Uniform orders |

## How it works

**Stored data.** Each staff record keeps its `duty` (label and preset) and optionally gains an `access` field: `{att: 'none'|'squad'|'officers'|'all', inv: 'none'|'use'|'import'|'manage', areas: [...]}`. Its squad stays in the existing `squad` field. With no `access` field, the account uses its duty's defaults, so existing logins are unchanged. *Reset to duty's access* removes the field.

**Rules.** `firestore.rules` gains one helper that reads `access` from the staff record, falling back to a table of duty defaults written in the rules. Every existing duty check (`isAdmin`, `canWeb`, `canUni`, `canCS`, `canInv`, `notWeb`, `markable`) is rewritten in terms of it. The Owner short-circuits to everything. Only the Owner can write staff records (already true), so only the Owner can change access. People and Community Services data can be read by anyone with Attendance, Roster or Community Services, which matches today.

**Parade HQ.**
- *Staff page (Owner):* each account card gets an **Access** section with the two level selects and the checklist, plus *Reset to duty's access*. A custom account shows as e.g. "Uniform · custom".
- *Changing the duty:* refills the ticks. If the account was custom, Parade HQ asks first.
- *New login form:* the duty fills in the ticks, and a *Customise access* toggle shows them.
- *Menu and start page:* follow the account's access. The start page is the first page it can open.
- *Demo:* "Preview as" uses each account's access.
- *Change record:* an access change is logged in the change record.
- *Inventory app:* reads the same access for its import and Google Sheet controls.
- *Drive photo script:* needs no change; it already follows the database rules through the officer's own sign-in.

## Rollout

Publish the new `firestore.rules` once. Until it's published, custom ticks only change the menu, so the guide and the Staff page say so.

## Left to the builder

- Exact wording and layout of the Access section, in the app's existing style, working on phones.
- Tests: rules emulator tests confirming every duty's default matches today's suites (the existing 49- and 117-check suites must still pass unchanged), plus custom-access cases. Browser tests for the Staff page editor and menu.
