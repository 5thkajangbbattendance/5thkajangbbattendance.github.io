# Inventory (React + Vite)

The Inventory page of Parade HQ (Company → Inventory). This folder is its source; the built page is in `../inventory/`, which Parade HQ shows inside its own layout. Opened on its own, `/inventory/` sends people to Parade HQ → Inventory (the staff login), except on localhost.

## What it does

- **Categories**: Uniform, Used Uniform, Badges, Books and Equipment are built in, so every section has them (including in the Category dropdown, with 0 until used); Category is a dropdown (the same on every browser and phone) with **Other…** to type a new one, which is then offered in the dropdowns; typing a built-in one in any letter case uses its usual spelling.
- **Sections**: every item belongs to one of Pre-Junior, Junior, Senior, Officers or Primers (chosen in the add form and when editing). Tabs at the top (with counts) show all sections or one; a tab narrows the summary cards, Reorder Alert, table and dropdown counts to that section, and the add form starts in that section. The same item name can exist once per section and category (e.g. a Brigade Tee for Pre-Junior and for Junior, or a Junior Shirt as Uniform and as Used Uniform). The table has a sortable Section column (hidden inside a single section's tab), and search also matches section names.
- **Summary cards** at the top: Total Items (with units in stock), Total Inventory Value, Low Stock Items and Out of Stock Items. Worked out from every item (search and filters do not change them) and updated whenever an item is added, saved or deleted.
- Table columns: Item Name, Category, Stock Level, Reorder Threshold, Unit Price, Total Value, Status.
- **Total Value** is always Stock Level × Unit Price. It is worked out on the page (in whole sen, so no rounding errors) and updates as you type. There is no field to type it in.
- **Status** badge, worked out and never typed in: green In Stock (above the reorder threshold), amber Low Stock (at or below it, above 0), red Out of Stock (0). It changes as you type a new stock level.
- **Reorder Alert** panel above the table: every Low Stock and Out of Stock item, Out of Stock first, with its stock and reorder level. Updates whenever stock changes.
- Add form, Edit and Delete on every row, and a confirmation before anything is deleted.
- **Search** (filters as you type, by item name or category; every word must match; Esc clears), **Category** dropdown and **Status** filter (All, In Stock, Low Stock, Out of Stock), with counts.
- **Sorting**: click a column header for ascending, again for descending. Status sorts most urgent first. Phones get a **Sort by** menu instead, because the column headers are hidden there.
- **No results**: when a search or filter finds nothing, the table says so, repeats what was searched for and filtered (e.g. “tent” · In Stock in Senior) and offers **Clear search and filters**.
- **Export CSV** downloads only the rows the table is showing (after the section tab, search, filters and sort), in the same order: Item Name, Section, Category, Stock Level, Reorder Threshold, Unit Price (RM), Total Value (RM), Status. It opens in Excel or Google Sheets; cells that start with = + - @ are saved as plain text.
- Search, filters and sorting all apply together. **Clear all** resets them; with no matches, **Clear search and filters** keeps the sort.
- Opens with 5 sample items.
- Follows Parade HQ's theme (light or dark) and accent colour, live.

**Saving:** inside Parade HQ with Firebase, items are saved in the database (collection `inventoryItems`, see `src/store.js`) and changes appear on every officer's screen straight away. The page uses Parade HQ's own signed-in connection (`window.BB_INV`), so there is no second login. Who can see and change items is set in `firestore.rules` (Owner, Admin, Commander, Squad Leader, Uniform). If the database refuses a change, it is undone and a message says why. In Parade HQ demo mode, a local preview or the tests, the page uses the 5 sample items instead.

**Google Sheet:** every save adds 1 to `inventoryMeta/sync` and calls the connected sheet's web app link, so the sheet copies the inventory within seconds (`../sheet-sync.gs`, setup in `../SHEET-SETUP.md`). A bar on the page shows whether the sheet is up to date, with an **Open spreadsheet** button.

Styles use one spacing scale and one type scale (top of `src/App.css`); the layout works from 375px phones up, inside Parade HQ.

## Change it

```bash
cd inventory-app
npm install
npm run dev      # local preview at http://localhost:5173/inventory/
npm test         # the automatic checks
npm run build    # writes the live page into ../inventory/
```

Commit both `inventory-app/` and `inventory/` after a build. GitHub Pages serves `inventory/` as it is.
