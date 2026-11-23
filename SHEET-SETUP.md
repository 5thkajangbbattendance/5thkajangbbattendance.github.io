# Inventory → Google Sheet

This copies the **Inventory** page of Parade HQ into a Google Sheet and keeps it up to date by itself. Nothing runs on a timer. Each time someone adds, edits or deletes an item, Parade HQ tells the spreadsheet, and it copies the inventory again within a few seconds.

Parade HQ is still where changes are made. The spreadsheet is a copy: anything typed into its tabs is replaced at the next update. You can add your own extra tabs, and those are never touched.

| Tab | What it shows |
| --- | --- |
| Summary | Total items, units in stock, total inventory value, low stock and out of stock items, and when it last copied |
| Inventory | Laid out like the page: a band for each section (Pre-Junior, Junior, Senior, Officers, Primers), a heading for each category (Uniform, Used Uniform, Badges, Books, Equipment…), then each item with stock, reorder level, unit price, total value and status (green, amber or red) |
| Reorder | Every Low Stock and Out of Stock item, most urgent first |
| All items | One plain row per item (section, category, stock, reorder threshold, prices, status, when it last changed and by whom), for sorting, filters or Excel |

## Before you start: publish the database rules

Inventory now saves items to Parade HQ's database, so the database needs the latest rules:

1. Open [firestore.rules](https://github.com/5thkajangbbattendance/5thkajangbbattendance.github.io/blob/main/firestore.rules) and copy all of it.
2. In the Firebase console, open **Firestore Database → Rules**, replace everything with what you copied, and click **Publish**.

Until then, the Inventory page says it cannot load or save.

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

If you already made a `sheet` login for the earlier version, you can use it again.

### 2. Make the spreadsheet

1. Open [sheets.new](https://sheets.new). Sign in with the Google account that should own the spreadsheet.
2. Name the spreadsheet, for example *5th Kajang BB Inventory*.

You can also reuse the spreadsheet from the earlier version. Its old tabs are removed at the first update.

### 3. Paste the script

1. In the spreadsheet, open **Extensions → Apps Script**.
2. Delete everything in the editor.
3. Open [sheet-sync.gs](https://raw.githubusercontent.com/5thkajangbbattendance/5thkajangbbattendance.github.io/main/sheet-sync.gs), select all of it and copy it.
4. Paste it into the Apps Script editor and click **Save** (the disk icon).

### 4. Give the script a web app link

Parade HQ uses this link to tell the spreadsheet when something changes.

1. Still in Apps Script, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set these options:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Google asks for permission:
   1. Click **Authorize access** and choose your account.
   2. If you see "Google hasn't verified this app", click **Advanced**, then **Go to … (unsafe)**. This warning appears because it is your own script, not a published app.
   3. Tick **Select all**, then click **Continue** or **Allow**.
6. Copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends with `/exec`.
7. Close the Apps Script tab.

"Anyone" only means Parade HQ can call the link without signing in to Google. Opening the link shows only a one-line status. All it does is make the sheet copy the latest inventory from Parade HQ.

If you are reusing the earlier spreadsheet, instead open **Deploy → Manage deployments**, click the pencil, choose **Version: New version** and click **Deploy**. The link stays the same.

### 5. Connect

1. Reload the spreadsheet. A new **Inventory** menu appears after a few seconds.
2. Click **Inventory → Connect to Parade HQ**. If Google asks for permission again, allow it, then click Connect again.
3. Enter the `sheet` username and password, paste the web app link, then click **Connect and copy now**.

The tabs fill in straight away. In Parade HQ, the Inventory page now shows **Google Sheet · up to date** with an **Open spreadsheet** button.

## Day to day

- **Updates:** a change made on the website appears in the sheet within a few seconds. Use **Inventory → Update now** to copy by hand.
- **Lost signal:** if a phone loses signal right after saving, the sheet may miss that message. Parade HQ then shows *updating now…*, and the next person to open the Inventory page a minute or more later sends the message again.
- **Usage:** nothing runs when nobody is saving. Each save makes the sheet read every item once, so with 300 items a save costs about 300 reads. The free Firebase limit is 50,000 reads a day, which at that size is about 150 saves a day.
- **Excel:** use **File → Download → Microsoft Excel (.xlsx)** for an Excel copy. Excel can also open the Google Sheet link directly.
- **Sharing:** share the spreadsheet with other officers as **Viewer**. Do not make other people Editors: an editor can change the script, and the script runs with your Google account.
- **Changed the sheet login's password:** run **Inventory → Connect to Parade HQ** again with the new password.
- **Stop updates:** use **Inventory → Disconnect**.
- **Changed the script:** after pasting a newer sheet-sync.gs, open **Deploy → Manage deployments**, click the pencil, choose **Version: New version** and click **Deploy**. The web app link stays the same.
- **Warning on the Inventory page:** if Parade HQ says *not updated since…*, open the spreadsheet and use **Inventory → Update now**. It shows the reason if something is wrong, for example a changed password.
