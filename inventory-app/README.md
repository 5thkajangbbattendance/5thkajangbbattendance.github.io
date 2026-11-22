# Inventory (React + Vite)

The Inventory page of the website, live at **/inventory/**. This folder is its source; the built page is in `../inventory/`.

## What it does

- Table columns: Item Name, Category, Stock Level, Reorder Threshold, Unit Price, Total Value, Status.
- **Total Value** is always Stock Level × Unit Price. It is worked out on the page (in whole sen, so no rounding errors) and updates as you type. There is no field to type it in.
- **Status**: Out of stock at 0, Low stock at or below the reorder threshold, otherwise In stock.
- Add form, Edit and Delete on every row, and a confirmation before anything is deleted.
- Opens with 5 sample items.
- Light, dark or match-device theme, shared with Parade HQ.

Items are kept in the page only for now, so a reload goes back to the 5 sample items.

## Change it

```bash
cd inventory-app
npm install
npm run dev      # local preview at http://localhost:5173/inventory/
npm test         # the automatic checks
npm run build    # writes the live page into ../inventory/
```

Commit both `inventory-app/` and `inventory/` after a build. GitHub Pages serves `inventory/` as it is.
