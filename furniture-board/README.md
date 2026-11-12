# Furniture board back end (Google Sheets + Forms + Apps Script)

`Code.gs` turns one Google Sheet into the furniture board's back end. Run it once and it creates:

- **Three Google Forms:** *Sell or give away an item*, *Request an item*, and *Update a listing or request* (people reach the last one through links in their emails, already filled in).
- **Tabs in the sheet:** Listings, Requests, Public (safe to publish), Dashboard, Settings, Log, and one response tab per form.
- **Automatic emails and a daily check** (details below).

## Set it up (about 10 minutes)

1. **Create a blank Google Sheet.** Use a Harvard Google account if you have one, so the board belongs to Harvard rather than a personal account. Name it something like *Furniture board*.
2. **Add the script.** In the sheet, open **Extensions → Apps Script**. Delete the sample code, paste all of `Code.gs`, and click **Save**.
3. **Run setup.** In the function menu at the top, choose **setup**, then click **Run**.
   - Google asks you to approve permissions: see and edit this spreadsheet, create and edit Google Forms, send email as you, and run the script on a schedule.
   - If you see *Google hasn't verified this app*, click **Advanced → Go to (project name)**. It's your own script.
4. **Get the form links.** Go back to the sheet and open the **Settings** tab. The three form links are there. Reload the sheet to see the **Furniture board** menu.
5. **Publish only the Public tab** (for the website): **File → Share → Publish to web**, choose **Public** and **Comma-separated values (.csv)**, then **Publish**. Copy the link; the website needs it.
6. **Test it.** Post an item with the Sell form using your Harvard email, then request it from a teammate's Harvard email, and confirm it with the link in your email.

## Connect it to the website

The furniture page reads its settings from `website/assets/furniture-config.js`. Fill in three links from the Google Sheet:

| In `furniture-config.js` | Where to find it |
|---|---|
| `csvUrl` | The link from **File → Share → Publish to web** for the **Public** tab, as **Comma-separated values (.csv)** |
| `requestTemplate` | Settings tab, the value next to **Request link template** |
| `sellFormUrl` | Settings tab, the value next to **Sell form link** |

Once those are filled in, the furniture page:

- shows real listings from the Public tab;
- marks items "On hold" or "Reserved" while a request is open;
- gives each available item a **Request this item** button that opens the request form with the listing ID and the student's signed-in Harvard email already filled in;
- shows the Google sell form on the **Sell something** tab.

New posts take a few minutes to appear, because Google refreshes published sheets every few minutes. If the sheet can't be reached, or `csvUrl` is empty, the page shows the sample listings.

If you ran setup before the request form could prefill the email, paste the newest `Code.gs` and run **setup** again. It keeps your data and forms and only refreshes the links on the Settings tab.

## How it works

| Step | What happens | Who is emailed |
|---|---|---|
| Seller posts | New row on Listings as **Available**, with a private manage code | Seller: confirmation with links to mark sold or withdraw |
| Buyer requests | New row on Requests as **Pending**; the listing becomes **Requested** | Seller: confirm or decline links. Buyer: a cancel link. No emails are shared yet. |
| Seller confirms | Request **Confirmed**, listing **Reserved** | Each gets an introduction email with the other's name and email; *Reply* goes to the other person |
| Seller declines, or buyer cancels | Listing back to **Available** | The other person |
| Seller marks sold elsewhere or withdraws | Listing closed; any open request cancelled | Seller, and the buyer if there was one |
| After the buyer arrives | Daily check asks both "Did the handoff happen?" (once) | Buyer and seller |
| Someone reports the handoff | **Completed**, or back to Available if it fell through | Both |

The daily check (about 8am) also:

- **Releases unanswered requests:** a request the seller hasn't answered within 5 days goes back on the board.
- **Reminds sellers:** a seller gets one reminder 3 days before the pick-up-by date.
- **Expires listings:** a listing whose pick-up-by date has passed is taken off the board.

You can change these timings on the Settings tab. The **Dashboard** tab counts listings and requests by status. Its **Completed** count is the number of items that actually changed hands.

## Privacy

- **Private tabs:** Listings and Requests hold names, Harvard emails and manage codes. Share the spreadsheet with the team only, and never publish any tab except **Public**, which has no names, emails or codes.
- **When emails are shared:** buyer and seller see each other's email only after the seller confirms.
- **Manage links:** the links in emails contain a private code, so only the seller can change a listing and only the buyer can cancel their request. Don't forward those emails.
- **Harvard check:** the forms only accept Harvard addresses, by checking the ending. If the sheet belongs to a Harvard Google Workspace account, set *Require Harvard Google sign-in* to **Yes** on the Settings tab before running setup; Google then confirms each person's address.
- **Log tab:** records what happened by ID only, with no names or emails.

## Limits and fixes

- **Email quota:** the script sends email from the account that ran setup. Google limits how many emails a script can send each day: roughly 100 recipients for a personal account, more for Workspace. That's plenty for one arrival season.
- **Something broke:** open **Extensions → Apps Script → Executions** to see errors. **Furniture board → Run setup** repairs missing tabs, forms or triggers without deleting data.
- **Changing a form question:** don't rename questions in the forms; the script reads answers by question title. Adding new questions is fine.

## Testing

`test/harness.js` runs the whole flow against simulated Google services: setup, posting, requests, confirm, decline, cancel, handoff, reminders, expiry, and attempts to act without the right code. Run it with `node test/harness.js`; it doesn't touch Google.
