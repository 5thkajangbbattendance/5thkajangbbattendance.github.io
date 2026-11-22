# Inventory → Google Sheet

This copies everything on the **Inventory** page of Parade HQ into a Google Sheet and keeps it up to date by itself. The sheet checks for changes every 5 minutes and only copies again when something changed.

Parade HQ is still where changes are made. The spreadsheet is a copy: anything typed into its tabs is replaced at the next update. You can add your own extra tabs, and those are never touched.

The spreadsheet has these tabs:

| Tab | What it shows |
| --- | --- |
| Summary | Items in stock, RM collected from members, RM owed to officers, RM spent on stock, and when it last copied |
| Stock | Every item and size with the number in stock |
| Owed to officers | What each officer paid upfront, what they have been repaid, and what they are still owed |
| Collected | Who is holding the money members paid |
| Stock in | Every purchase, one row per item, with shipping and the purchase total shown once |
| Sold & issued | Every sale or free issue, with who entered it |
| Member payments | Every payment from a member and who collected it |
| Repayments | Every repayment to an officer |

## Set up (about 5 minutes, once)

### 1. Make a login for the spreadsheet

The spreadsheet needs its own Parade HQ login so it can read the inventory.

1. In Parade HQ, sign in as Owner and open **Staff**.
2. Create a login with these details:
   - **Name:** Inventory sheet
   - **Username:** sheet
   - **Duty:** Uniform
   - **Password:** a strong one
3. Do not give this login to anyone.

### 2. Make the spreadsheet

1. Open [sheets.new](https://sheets.new). Sign in with the Google account that should own the spreadsheet.
2. Name the spreadsheet, for example *5th Kajang BB Inventory*.

### 3. Paste the script

1. In the spreadsheet, open **Extensions → Apps Script**.
2. Delete everything in the editor.
3. Open [sheet-sync.gs](https://raw.githubusercontent.com/5thkajangbbattendance/5thkajangbbattendance.github.io/main/sheet-sync.gs), select all of it and copy it.
4. Paste it into the Apps Script editor and click **Save** (the disk icon).
5. Close the Apps Script tab.

### 4. Connect

1. Reload the spreadsheet. A new **Inventory** menu appears after a few seconds.
2. Click **Inventory → Connect to Parade HQ**.
3. The first time, Google asks for permission:
   1. Click **Continue** and choose your account.
   2. If you see "Google hasn't verified this app", click **Advanced**, then **Go to … (unsafe)**. This warning appears because it is your own script, not a published app.
   3. Click **Allow**.
4. Click **Inventory → Connect to Parade HQ** again.
5. Enter the `sheet` username and password, then click **Connect and copy now**.

The tabs fill in straight away. In Parade HQ, the Inventory page now shows **Google Sheet · up to date** with an **Open spreadsheet** button.

## Day to day

- **Updates:** changes made on the website appear in the sheet within 5 minutes. Use **Inventory → Update now** to copy straight away.
- **Excel:** use **File → Download → Microsoft Excel (.xlsx)** for an Excel copy. Excel can also open the Google Sheet link directly.
- **Sharing:** share the spreadsheet with other officers as **Viewer**. Do not make other people Editors: an editor can change the script, and the script runs with your Google account.
- **Changed the sheet login's password:** run **Inventory → Connect to Parade HQ** again with the new password.
- **Stop updates:** use **Inventory → Disconnect**.
- **Warning on the Inventory page:** if Parade HQ says *not updated since…*, open the spreadsheet and use **Inventory → Update now**. It shows the reason if something is wrong, for example a changed password.
