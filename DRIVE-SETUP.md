# Uniform order photos → Google Drive

Parade HQ can keep two kinds of photos on each uniform order:

| Where | When it shows | What it is for |
| --- | --- | --- |
| **Payment proof** | Orders marked Paid, Ready or Collected | The receipt or transfer screenshot the parent sent (photo, screenshot or PDF). Once you have checked the amount and name, press **Yes, it matches**, and Parade HQ records who checked it and when. |
| **Collection** | Orders marked Ready or Collected | A checklist of every part in the order. Tick each part as the parent receives it; Parade HQ records who ticked it and when. Add **handover photos** as proof of collection. When every part is ticked, **Mark order as collected** finishes the order. |

The photos are saved in **your Google Drive**, in a folder called **5th Kajang BB · Uniform order photos**, with one folder per order (for example `U-P2D8W · Tan Wei Ming`). Files are named by order number, kind and time, such as `U-P2D8W payment proof 2026-11-23 1402 05.jpg`.

## How it stays private

- The photos stay private in your Drive. Nothing is shared publicly.
- Parade HQ talks to Drive through a small Google Apps Script that you deploy from your own Google account. The script runs as you, so it can save into your Drive.
- With each request, Parade HQ sends the officer's sign-in token, never a password. Before saving, showing or removing a photo, the script reads that order from the Parade HQ database **using the officer's own token**. The database rules allow that only for logins that can see uniform orders (Owner, Admin, Website and Uniform, or any role with Uniform orders), so anyone else is turned away.
- A photo can only be shown or removed if that order lists it, so the script cannot be used to read anything else in your Drive.
- Photos are shrunk on the phone before upload (long side 2000 pixels), so receipts stay readable and uploads are quick, about 200–600 KB each. Each order keeps a small preview, so order pages open instantly; the full photo loads from Drive when you open it.
- Removing a photo moves it to the Drive bin, which keeps it for 30 days. Deleting a whole order leaves its photos in Drive.

## Set up (about 5 minutes, once)

Use the Google account whose Drive should keep the photos.

### 1. Make the script

1. Go to [script.google.com](https://script.google.com) and click **New project**.
2. Click **Untitled project** at the top and name it `5th Kajang BB photos`.
3. Delete everything in the editor. Open [drive-photos.gs](https://github.com/5thkajangbbattendance/5thkajangbbattendance.github.io/blob/main/drive-photos.gs), copy all of it, paste it in, then click **Save** (the disk icon).

### 2. Allow it to use your Drive

1. In the toolbar, choose the function **setup**, then click **Run**.
2. Google asks for permission. Click **Review permissions**, choose your account, then **Allow**. If you see "Google hasn't verified this app", click **Advanced**, then **Go to 5th Kajang BB photos (unsafe)**. It is your own script, so this is expected.
3. The log at the bottom shows `Photos will be saved in: 5th Kajang BB · Uniform order photos` with a link. That folder is now in your Drive.

### 3. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear next to *Select type* and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. "Anyone" lets Parade HQ reach it. The script still checks every request against the Parade HQ database, as explained above.
4. Click **Deploy** and copy the **Web app** link. It looks like `https://script.google.com/macros/s/…/exec`.

### 4. Publish the database rules

The rules gained one line for the photo storage link. In the Firebase console, open **Firestore Database → Rules**, replace everything with the contents of [firestore.rules](https://github.com/5thkajangbbattendance/5thkajangbbattendance.github.io/blob/main/firestore.rules), and click **Publish**.

### 5. Connect Parade HQ

1. Sign in to Parade HQ as the **Owner**, an **Admin**, or any login whose role has **Photo storage settings: Change**, and open **Uniform orders**.
2. In the **Photo storage** card, click **Connect Google Drive**, paste the web app link and click **Test and connect**.
3. It says **Google Drive connected**. Every officer who handles uniform orders can now add photos.

## Using it

- **Payment proof**: open an order and set it to **Paid**. Under *Payment proof*, tap **Add proof**. On a phone you can take a photo or choose a screenshot. On a computer you can also drag files onto the card, or copy a screenshot (for example from WhatsApp Web) and press **Ctrl+V** while the order is open. Up to 10 files per order.
- **Check the payment**: open the proof, check the amount and name, then press **Yes, it matches**. The orders list shows **No payment proof** or **Proof not checked** under orders that still need it (cash orders are not flagged).
- **Collection**: set the order to **Ready**. As the parent receives each part, tick it. **Tick all parts** ticks the rest. Add a **handover photo**, then **Mark order as collected**. If you mark an order Collected with parts not ticked, Parade HQ asks first.
- **Open a photo**: tap it to see it full size, **Download** it, **Open in Google Drive**, or **Remove** it.
- **Excel**: *Download Excel* now has **Payment proof** and **Handed over** columns, and each order's sheet lists its Drive links.

## Enquiry emails

The same script can email you the moment someone sends an enquiry from the website's join form. It sends one email per enquiry, straight away, and nothing runs in between.

1. **Choose where the emails go (optional).** At the top of the script, `ALERT_TO` is empty, which means emails go to the Google account that runs the script. To use another address, put it between the quotes, e.g. `var ALERT_TO = '5thkjbbm@gmail.com';`. Separate more than one address with commas.
2. **Allow it to send email (once).** In the script editor, choose **setup** and press **Run**. Google asks for permission to send email as you; allow it.
3. **Deploy a new version.** **Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy.**
4. **Turn it on in Parade HQ.** Open **Enquiries**, then press **Turn on email alerts**. A test email arrives, and from then on every enquiry is emailed to you.

Each email has the parent's name, phone, email, child, age, school and message, a WhatsApp link, and a link to open Parade HQ. Pressing **Reply** writes to the parent if they gave an email.

The script sends at most 30 enquiry emails an hour, so nobody can flood your inbox. Enquiries are still saved in Parade HQ either way. **Turn off** (on the Enquiries page) stops the emails.

## Form uploads (File upload questions)

The same script also takes files people send with a **File upload** question in **Forms**.

- Files go into **5th Kajang BB · Form uploads** in your Drive, with one folder per form, named after the form.
- On the form's **Responses** tab, **Open folder** opens it. Each response also links to its files.
- Anyone with the form link can send a file, so the script only accepts one:
  - while the form is open;
  - for a File upload question on that form;
  - of the allowed type (photos, PDF, or documents, as set on the question);
  - within the size limit (1, 5 or 10 MB);
  - and up to 300 files per form per hour.
- Files stay private in your Drive. To let other officers open them, share the **Form uploads** folder with them in Google Drive.

**If you set up the script before File upload existed**, update it once:
1. Open your script at [script.google.com](https://script.google.com).
2. Replace everything with the latest [drive-photos.gs](https://github.com/5thkajangbbattendance/5thkajangbbattendance.github.io/blob/main/drive-photos.gs) and click **Save**.
3. Click **Deploy → Manage deployments**, then the pencil (**Edit**). Set **Version** to **New version** and click **Deploy**. The link stays the same.
4. Back in Parade HQ, open each form that has a File upload question and make any small edit, so it picks up the link.

## Changing or stopping it

- **Test connection** (Photo storage card) checks the script still answers.
- **Change link**: after changing the script, use **Deploy → Manage deployments → Edit → Version: New version** to keep the same link. A *New deployment* makes a new link, which you then paste with **Change link**.
- **Disconnect** stops new uploads and viewing in Parade HQ. Photos already saved stay in Drive.
- To move photos to another Google account, set up the script in that account and connect its link. Earlier photos stay in the first account's Drive.

## If something goes wrong

| Message | What to do |
| --- | --- |
| *Could not reach Google Drive* | Check the internet connection. If it keeps happening, check the deployment's **Who has access** is **Anyone** (not "Anyone with a Google account"). |
| *That link did not answer like the photo script* | Paste the **Web app** link that ends in `/exec`, not the editor link. |
| *Your login is not allowed to handle uniform orders* | Sign in with a login whose role includes Uniform orders. |
| *The database turned the change away* | Do step 4: publish the latest `firestore.rules`. |
| *Your sign-in has expired* | Reload Parade HQ. |
| *This photo was deleted from Google Drive* | Someone deleted it in Drive. Remove it from the order too. |

In the demo (no Firebase connected), photos stay in that browser only.
