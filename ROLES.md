# Roles and permissions

Parade HQ uses roles, like Discord:

- The Owner makes roles, such as **Squad 2 Leader**, **Uniform Team**, **Notice Editors** or **Committee**.
- Each role chooses **See** or **Change** for each area of Parade HQ, and **See** or **Mark** for each attendance group.
- A login can hold **any number of roles** and gets everything they give together.
- The **Everyone** role (like Discord's @everyone) gives something to every login. It starts with nothing.
- The **Owner** always has everything and can't lose it.

The database rules check every permission, not just the menu. An area a login can't see can't be read, even by someone poking at the database directly.

## Switching on roles (once)

1. **Publish the latest database rules.** In the Firebase console, open **Firestore Database → Rules**, replace everything with the contents of [firestore.rules](firestore.rules), and click **Publish**.
2. **Set up roles.** Sign in to Parade HQ as the Owner and open **Staff**. Click **Set up roles**, then confirm.

Parade HQ then:

- makes one role for each old duty: Admin, Parade Commander, Squad 1–4 Leader, Community Services, Website and Uniform, plus Everyone;
- gives each login the role matching its duty.

**Nobody's access changes.** Before you press the button, everything keeps working on the old duties. The new rules understand both.

## What a role can give

| Area | Choices | What it opens |
|---|---|---|
| **Attendance**, per group: Officers, Primers, Helper, Squad 1–4 | None · See · Mark | **See**: the group on Home, Members (squads), Parade Desk (officers, primers, helper) and Calendar. **Mark**: also take attendance for it on open parades. |
| **Run parades** | Change | Open, dismiss and reopen parades, parade-off days, Set Marks, and correcting marks after dismissal. Includes marking every group. |
| **Reports & year record** | See | Report and Year Record pages, Excel and print. Includes seeing every group. |
| **Roster & members data** | See · Change | Roster, Members Data, register |
| **Change record** | See | Who changed which mark, and when |
| **Community Services** | See · Change | Services, hours, badges, groups |
| **Website** | See · Change | Posts, Our team, Site details |
| **Notice board & forms** | See · Change | Notices, forms and form responses |
| **Enquiries** | See · Change | Recruitment enquiries |
| **Uniform orders** | See · Change | Orders, payment proof, collection checklist, photos |
| **Uniform setup** | Change | Uniform items and prices, opening and closing ordering, Uniform page header, payment methods |
| **Photo storage settings** | Change | Connect, change or disconnect Google Drive |
| **Inventory** | See · Change · Change + import · Manage | The stock list. *Change + import* adds CSV import. *Manage* also sets up the Google Sheet. |
| **Staff board** | See | The Staff page and who holds which role, read-only |
| **Activity log** | See | Every change made in Parade HQ: who, when, and what changed |

**Change** always includes See. With See only, a page opens **view only**: the editing buttons are hidden, pop-ups offer only Close, and the page says "View only".

Only the Owner can make logins, change usernames and passwords, set the recovery key, make or change roles, and change the colour accent.

## Everyday use

All of this is on the **Staff** page.

- **Make a role:** open the **Roles** tab and click **New role**. Then:
  1. Give it a name and a colour.
  2. Pick the choices for each group and area.
  3. Tick its members.
  4. Click **Make role**.
- **Change a role:** click **Edit**. Everyone holding it gets the change at once, and anyone signed in reloads into their new access.
- **Give or take a role:** on the **Logins** tab, use **Add role** on a login, or the **×** on one of its role chips. Each login shows a one-line summary of what it can do.
- **Copy a role:** **Edit**, then **Duplicate**. This is handy for "the same, plus one more thing".
- **Delete a role:** **Edit**, then **Delete**. Parade HQ says who loses what. Their other roles stay.
- **New login:** under **Issue a post**, tick one or more roles.
- **Remove someone:** **Revoke** signs them out and blocks sign-in but keeps their post, so you can **Reinstate** them later. **Delete** removes the login for good: they're signed out at once, the username is free to use again, and past marks keep their name.
- **Try it out:** in the demo, **Settings → Preview as** shows Parade HQ exactly as each login sees it.

### Examples

| You want | Make a role with |
|---|---|
| A committee member who can check orders and enquiries but not change them | Uniform orders: See, Enquiries: See |
| The Uniform officer to also post notices | A "Notice Editors" role (Notice board & forms: Change), added to them alongside Uniform |
| A leader who marks two squads | Their squad's leader role plus another squad's leader role, or one role with both squads on Mark |
| An officer who prints reports but marks no one | Reports & year record: See |

## Good to know

- **A parade is one record.** It holds every group's marks for that day, so the database can't hide part of it. Anyone who can see *any* attendance group could technically read that day's whole parade, just as Squad Leaders could before roles. The screens show only their groups, and marking is fully limited to the groups they can mark.
- **Role changes save in one go.** Parade HQ works out each affected login's combined access and saves it with the role, all or nothing. The database rules read that saved copy, so they never need to add up roles themselves.
- **A login with no roles** gets only what Everyone gives. It sees "Nothing to open yet" until you give it a role.

## Activity log

**Records → Activity** lists every change made in Parade HQ, newest first and grouped by day. Each entry shows:

- who made it, and when;
- what it was, such as *Order U-P2D8W*, *Notice “Camp 2026”*, *Role “Committee”* or *Item “Brigade Tee”*;
- what changed, field by field: *Status: Paid → Ready*.

You can filter by area or person, and search for an order number, name or value. Attendance marks stay on the **Changes** page. Opening, dismissing and parade-off days appear in both.

**Turning it on (once).** Publish the latest [firestore.rules](firestore.rules), then open **Activity** as the Owner and press **Turn on activity log**. Changes made before that weren't recorded.

**Who sees it.** The Owner and the starting Admin role. You can give it to anyone else with **Activity log: See** in a role. If you set up roles before this feature arrived, add **Activity log: See** to the Admin role yourself.

**Can it be trusted?** Each entry is saved in the same save as the change, so you never get one without the other. The database only accepts an entry in the signed-in person's own name, with the server's clock. Nobody, not even the Owner, can edit or delete an entry. The one gap: someone technical who skips Parade HQ and writes straight to the database wouldn't be logged. Closing that needs Firebase's paid plan.

**What's left out.** Bookkeeping fields such as "updated at". Long text is shortened. Photos are counted ("2 photos → 3 photos") rather than stored. The recovery key's value is never recorded, only that it changed.
