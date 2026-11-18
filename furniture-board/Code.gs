/**
 * Housing Made EZ: furniture board back end (Google Sheets + Google Forms + Apps Script)
 *
 * Set up once:
 *   1. Create a blank Google Sheet (ideally with a Harvard Google account).
 *   2. Extensions > Apps Script, delete the sample code, paste this file, Save.
 *   3. Choose the function "setup" and click Run. Approve the permissions.
 *   4. Back in the sheet, open the "Settings" tab for the three form links.
 *   5. Optional photos: in the Sell form, add a "File upload" question titled "Photos (optional)"
 *      (Google doesn't let scripts add upload questions). See README.md for the steps.
 *
 * What it does after that:
 *   - Sell form      -> new row on Listings, confirmation email to the seller with "manage" links.
 *   - Request form   -> new row on Requests, the listing is held, the seller is asked to confirm.
 *   - Update form    -> the seller confirms / declines / marks sold / withdraws; the buyer cancels;
 *                       either one reports whether the handoff happened.
 *   - Confirmation   -> buyer and seller get one email introducing them to each other.
 *   - Daily check    -> releases requests the seller never answered, reminds sellers before their
 *                       pick-up-by date, expires old listings, and asks "did the handoff happen?".
 *
 * Photos: uploads land in the form owner's Google Drive. The script renames each one to the listing ID,
 * makes it viewable by link so the website can show it, and makes it private again when the listing ends.
 *
 * Privacy: names and emails stay on Listings and Requests. The Public tab (the only tab meant to be
 * published for the website) has no names, emails or codes. Share the spreadsheet with the team only.
 */

/* ============================== Names used everywhere ============================== */

var TAB = {
  HOW: 'How to use', LISTINGS: 'Listings', REQUESTS: 'Requests', PUBLIC: 'Public',
  DASH: 'Dashboard', SETTINGS: 'Settings', LOG: 'Log',
  SELL_RESP: 'Sell responses', REQ_RESP: 'Request responses', UPD_RESP: 'Update responses'
};

var LISTING_COLS = ['Listing ID', 'Posted', 'Item', 'Category', 'Price ($)', 'Condition',
  'Width (in)', 'Depth (in)', 'Height (in)', 'Area', 'Available from', 'Pick up by',
  'Handoff if seller has left', 'Payment accepted', 'Bundle?', 'Moving day OK?', 'Pickup notes',
  'Description', 'Photo link', 'Status', 'Request link',
  // Private columns: everything from here on is left out of the Public tab.
  'Seller name', 'Seller Harvard email', 'Seller code', 'Active request', 'Reminder sent', 'Updated', 'Photo preview'];
var PUBLIC_LAST_COL = 'U'; // column of "Request link", the last public column

var REQUEST_COLS = ['Request ID', 'Received', 'Listing ID', 'Item', 'Buyer name', 'Buyer Harvard email',
  'Arrival date', 'Pickup', 'Message', 'Status', 'Buyer code', 'Seller Harvard email', 'Check sent', 'Updated'];

var LOG_COLS = ['When', 'Event', 'Listing ID', 'Request ID', 'Detail'];

var LISTING_STATUS = { AVAILABLE: 'Available', REQUESTED: 'Requested', RESERVED: 'Reserved',
  COMPLETED: 'Completed', SOLD: 'Sold elsewhere', WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired', REJECTED: 'Rejected' };
var REQUEST_STATUS = { PENDING: 'Pending', CONFIRMED: 'Confirmed', DECLINED: 'Declined', RELEASED: 'Released (no reply)',
  CANCELLED: 'Cancelled', COMPLETED: 'Completed', NOT_COMPLETED: 'Not completed', REJECTED: 'Rejected' };

var CATEGORIES = ['Beds & mattresses', 'Desks & chairs', 'Sofas & seating', 'Storage', 'Kitchen', 'Lamps & other'];
var CONDITIONS = ['Like new', 'Good', 'Fair'];
var AREAS = ['Cambridge – Harvard Sq', 'Cambridge – Central / Kendall', 'Cambridge – Porter / North',
  'Somerville', 'Allston / Brighton', 'Harvard University Housing', 'Boston – other'];
var HANDOFFS = ["I'll still be in town", 'A friend will hand it over', "It'll be in storage", 'It stays in the apartment'];
var PAYMENTS = ['Cash at pickup', 'Venmo / Zelle', "Pay after the buyer's US bank account opens"];
var PICKUP_SELF = "I'll pick it up myself";

/* Form question titles. The handlers read answers by these titles, so keep them in sync with the forms. */
var Q = {
  ITEM: 'What are you selling or giving away?', CATEGORY: 'Category', PRICE: 'Price in dollars (0 if free)',
  CONDITION: 'Condition', WIDTH: 'Width (inches)', DEPTH: 'Depth (inches)', HEIGHT: 'Height (inches)',
  AREA: 'Where is it?', FROM: 'Available from', UNTIL: 'Must be picked up by', HANDOFF: "If you've left before pickup",
  PAYMENT: 'Payment you accept', BUNDLE: 'Is this a bundle of several items?', MOVEDAY: 'OK with a group moving day pickup?',
  PICKUP_NOTES: 'Pickup notes', DESCRIPTION: 'Description', PHOTO: 'Photo link (optional)', UPLOAD: 'Photos (optional)',
  NAME: 'Your name', EMAIL: 'Your Harvard email',
  LISTING_ID: 'Listing ID', ARRIVAL: 'When do you arrive in Boston?', PICKUP: 'How will you collect it?',
  MESSAGE: 'Message to the seller (optional)',
  CODE: 'Manage code', ACTION: 'What do you want to do?'
};

var ACTION = {
  CONFIRM: 'Confirm the request', DECLINE: 'Decline the request', SOLD: 'Mark as sold or given away elsewhere',
  WITHDRAW: 'Withdraw my listing', CANCEL: 'Cancel my request', DONE: 'The handoff happened',
  NOT_DONE: "The handoff didn't happen"
};

var SETTING = {
  TEAM_EMAIL: 'Team contact email', REQUEST_DAYS: 'Days a request waits for the seller',
  REMIND_DAYS: 'Days before pick-up-by to remind the seller', CHECK_DAYS: 'Days after arrival to ask if the handoff happened',
  MOVING_DAYS: 'Moving days (separate with ;)', REQUIRE_LOGIN: 'Require Harvard Google sign-in on the forms (Yes/No)',
  SELL_LINK: 'Sell form link', REQUEST_LINK: 'Request form link', UPDATE_LINK: 'Update form link',
  REQUEST_TEMPLATE: 'Request link template', SITE: 'Website furniture page'
};
function actionTemplateKey_(action) { return 'Update link: ' + action; }

var HARVARD_RE = /^[^\s@]+@([a-z0-9-]+\.)*harvard\.edu$/i;
// Placeholders written into the prefilled-link templates at setup, replaced when an email is sent.
var PH = { LISTING: 'XLISTINGIDX', CODE: 'XCODEX', EMAIL: 'xemailx@harvard.edu' };
var MAIL_NAME = 'Housing Made EZ furniture board';

/* ============================== Menu ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Furniture board')
    .addItem('Run setup (first time, or to repair)', 'setup')
    .addItem('Run the daily check now', 'dailyCheck')
    .addItem('Show form links', 'showLinks')
    .addSeparator()
    .addItem('Add 7 sample listings (for testing)', 'addSampleListings')
    .addItem('Remove sample listings', 'removeSampleListings')
    .addToUi();
}

function showLinks() {
  var s = settings_();
  SpreadsheetApp.getUi().alert('Form links',
    'Sell: ' + s[SETTING.SELL_LINK] + '\n\nRequest: ' + s[SETTING.REQUEST_LINK] + '\n\nUpdate: ' + s[SETTING.UPDATE_LINK],
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ============================== Sample listings for testing ============================== */

var SAMPLE_SELLER = 'Sample seller';
var SAMPLE_NOTE = 'Sample listing for testing. ';
var SAMPLE_LISTINGS = [
  ['Queen bed frame + mattress', 'Beds & mattresses', 180, 'Like new', 63, 84, 14, 'Cambridge – Central / Kendall', [2027, 5, 1], [2027, 7, 31],
    'A friend will hand it over', 'Cash at pickup, Pay after the buyer\'s US bank account opens', 'Yes', 'Yes', '2nd floor, wide staircase', 'Mattress is two years old and always had a protector. Frame comes apart with an Allen key (included).'],
  ['Desk + desk chair', 'Desks & chairs', 60, 'Good', 47, 24, 30, 'Allston / Brighton', [2027, 4, 28], [2027, 7, 25],
    "It'll be in storage", 'Cash at pickup, Venmo / Zelle', 'Yes', 'Yes', 'Storage unit near Packard\'s Corner', 'Small scratch on the left corner. Chair has adjustable lumbar support.'],
  ['3-seat sofa, grey', 'Sofas & seating', 150, 'Good', 84, 35, 33, 'Somerville', [2027, 5, 10], [2027, 7, 31],
    "I'll still be in town", 'Cash at pickup', 'No', 'Yes', '3rd floor walk-up, no elevator', 'Comfortable, from a pet-free and smoke-free home. Cushion covers are machine washable.'],
  ['5-shelf bookcase', 'Storage', 25, 'Good', 31, 11, 71, 'Cambridge – Harvard Sq', [2027, 4, 25], [2027, 7, 20],
    'A friend will hand it over', 'Cash at pickup, Venmo / Zelle', 'No', 'Yes', 'Ground floor', 'Sturdy and easy to carry with two people.'],
  ['Kitchen starter kit for two', 'Kitchen', 0, 'Good', '', '', '', 'Harvard University Housing', [2027, 4, 30], [2027, 7, 31],
    'A friend will hand it over', 'Cash at pickup', 'Yes', 'No', 'Fits in one box', 'Two pans, a pot, a cutting board, knives, and plates, bowls and mugs for two. Free to a new student.'],
  ['6-drawer dresser', 'Storage', 70, 'Fair', 55, 19, 31, 'Cambridge – Porter / North', [2027, 5, 1], [2027, 7, 31],
    "I'll still be in town", 'Cash at pickup, Pay after the buyer\'s US bank account opens', 'No', 'Yes', 'Elevator building', 'One drawer handle is loose; it tightens with a screwdriver.'],
  ['Floor lamp + 5x8 rug', 'Lamps & other', 30, 'Like new', 60, 96, '', 'Allston / Brighton', [2027, 5, 5], [2027, 7, 31],
    "I'll still be in town", 'Venmo / Zelle, Cash at pickup', 'Yes', 'Yes', 'Rug is rolled and tied', 'Warm-light floor lamp and a neutral rug, sold together.']
];

/** Menu: adds 7 sample listings (no emails are sent). Requests for them go to the email you enter. */
function addSampleListings() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Add 7 sample listings',
    'Enter your Harvard email. You will be the "seller" of the samples, so request emails for them come to you.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var email = r.getResponseText().trim().toLowerCase();
  if (!HARVARD_RE.test(email)) { ui.alert('Please use a Harvard email address (ending in harvard.edu).'); return; }
  var n = addSampleListings_(email);
  ui.alert('Added ' + n + ' sample listings',
    'They are on the Listings tab and will appear on the website within about 5 minutes.\n\n' +
    'When you are done testing, use Furniture board > Remove sample listings.', ui.ButtonSet.OK);
}

function addSampleListings_(email) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var t = table_(TAB.LISTINGS), s = settings_();
    SAMPLE_LISTINGS.forEach(function (x) {
      var id = nextId_(t, 'Listing ID', 'F-');
      t.append({
        'Listing ID': id, 'Posted': new Date(), 'Item': x[0], 'Category': x[1], 'Price ($)': x[2], 'Condition': x[3],
        'Width (in)': x[4], 'Depth (in)': x[5], 'Height (in)': x[6], 'Area': x[7],
        'Available from': new Date(x[8][0], x[8][1], x[8][2]), 'Pick up by': new Date(x[9][0], x[9][1], x[9][2]),
        'Handoff if seller has left': x[10], 'Payment accepted': x[11], 'Bundle?': x[12], 'Moving day OK?': x[13],
        'Pickup notes': x[14], 'Description': SAMPLE_NOTE + x[15], 'Photo link': '',
        'Status': LISTING_STATUS.AVAILABLE, 'Request link': requestLink_(s, id),
        'Seller name': SAMPLE_SELLER, 'Seller Harvard email': email, 'Seller code': newCode_(),
        'Active request': '', 'Reminder sent': '', 'Updated': new Date()
      });
      log_('Sample listing added', id, '', '');
    });
    return SAMPLE_LISTINGS.length;
  } finally { lock.releaseLock(); }
}

/** Menu: removes every sample listing and any requests made for them. */
function removeSampleListings() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var removed = 0;
  try {
    var ss = SpreadsheetApp.getActive();
    var ids = {};
    var ls = ss.getSheetByName(TAB.LISTINGS), lt = table_(TAB.LISTINGS);
    var rows = lt.rows();
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i].get('Seller name') === SAMPLE_SELLER) { ids[rows[i].get('Listing ID')] = true; ls.deleteRow(i + 2); removed++; }
    }
    var rs = ss.getSheetByName(TAB.REQUESTS), reqs = table_(TAB.REQUESTS).rows();
    for (var j = reqs.length - 1; j >= 0; j--) {
      if (ids[reqs[j].get('Listing ID')]) rs.deleteRow(j + 2);
    }
    log_('Sample listings removed', '', '', removed + ' listings');
  } finally { lock.releaseLock(); }
  try { SpreadsheetApp.getUi().alert('Removed ' + removed + ' sample listings and any requests for them.'); } catch (e) {}
}

/* ============================== Setup ============================== */

function setup() {
  var ss = SpreadsheetApp.getActive();
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && !ss.getSheetByName(TAB.HOW)) blank.setName(TAB.HOW);
  ensureTab_(ss, TAB.HOW, null);
  ensureTab_(ss, TAB.LISTINGS, LISTING_COLS);
  addMissingHeaders_(TAB.LISTINGS, LISTING_COLS);
  ensureTab_(ss, TAB.REQUESTS, REQUEST_COLS);
  ensureTab_(ss, TAB.PUBLIC, null);
  ensureTab_(ss, TAB.DASH, null);
  ensureTab_(ss, TAB.SETTINGS, ['Setting', 'Value', 'Notes']);
  ensureTab_(ss, TAB.LOG, LOG_COLS);
  writeDefaultSettings_(ss);
  writeHowTo_(ss);
  writePublic_(ss);
  writeDashboard_(ss);

  var props = PropertiesService.getDocumentProperties();
  var s = settings_();
  var requireLogin = String(s[SETTING.REQUIRE_LOGIN] || '').toLowerCase() === 'yes';
  var movingDays = String(s[SETTING.MOVING_DAYS] || '').split(';').map(function (d) { return d.trim(); }).filter(String);

  var sell = getOrCreateForm_(props, 'SELL_FORM_ID', function () { return buildSellForm_(requireLogin); });
  var req = getOrCreateForm_(props, 'REQUEST_FORM_ID', function () { return buildRequestForm_(requireLogin, movingDays); });
  var upd = getOrCreateForm_(props, 'UPDATE_FORM_ID', function () { return buildUpdateForm_(requireLogin); });

  linkForm_(ss, sell, TAB.SELL_RESP);
  linkForm_(ss, req, TAB.REQ_RESP);
  linkForm_(ss, upd, TAB.UPD_RESP);

  // Links and prefilled-link templates the handlers use (no form calls needed while handling responses).
  setSetting_(SETTING.SELL_LINK, sell.getPublishedUrl());
  setSetting_(SETTING.REQUEST_LINK, req.getPublishedUrl());
  setSetting_(SETTING.UPDATE_LINK, upd.getPublishedUrl());
  setSetting_(SETTING.REQUEST_TEMPLATE, prefill_(req, [[Q.LISTING_ID, PH.LISTING], [Q.EMAIL, PH.EMAIL]]));
  Object.keys(ACTION).forEach(function (k) {
    setSetting_(actionTemplateKey_(ACTION[k]),
      prefill_(upd, [[Q.LISTING_ID, PH.LISTING], [Q.EMAIL, PH.EMAIL], [Q.CODE, PH.CODE], [Q.ACTION, ACTION[k]]]));
  });

  // Triggers: one for every form response, one daily check at about 8am.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'onFormSubmit' || f === 'dailyCheck') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('dailyCheck').timeBased().everyDays(1).atHour(8).create();

  ss.setActiveSheet(ss.getSheetByName(TAB.SETTINGS));
  try {
    SpreadsheetApp.getUi().alert('Furniture board is set up',
      'Your three form links are on the Settings tab.\n\nNext: publish the Public tab for the website ' +
      '(File > Share > Publish to web > Public > Comma-separated values).', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* no UI when run from the editor without the sheet open */ }
}

function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#0E8F68').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Adds any header in `headers` that an older version of the tab doesn't have yet, at the end. */
function addMissingHeaders_(tabName, headers) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tabName);
  if (!sh || sh.getLastRow() === 0) return;
  var have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  headers.forEach(function (h) {
    if (have.indexOf(h) >= 0) return;
    sh.getRange(1, have.length + 1).setValue(h).setFontWeight('bold').setBackground('#0E8F68').setFontColor('#FFFFFF');
    have.push(h);
  });
}

function writeDefaultSettings_(ss) {
  var defaults = [
    [SETTING.TEAM_EMAIL, '', 'Optional. Shown in emails as who to contact, and copied on problems.'],
    [SETTING.REQUEST_DAYS, 5, 'After this many days without an answer, a request is released.'],
    [SETTING.REMIND_DAYS, 3, 'The seller gets one reminder this many days before the pick-up-by date.'],
    [SETTING.CHECK_DAYS, 2, 'This many days after the buyer arrives, both get a "did the handoff happen?" email.'],
    [SETTING.MOVING_DAYS, 'Moving day: Sat, Aug 21, 2027; Moving day: Sat, Aug 28, 2027; Moving day: Wed, Sep 1, 2027',
      'Choices on the request form. Run setup again after changing them only if the forms are new.'],
    [SETTING.REQUIRE_LOGIN, 'No', 'Yes only works if this sheet belongs to a Harvard Google Workspace account.'],
    [SETTING.SITE, '', 'Optional. Link to the furniture page, used in emails.'],
    [SETTING.SELL_LINK, '', 'Filled in by setup.'],
    [SETTING.REQUEST_LINK, '', 'Filled in by setup.'],
    [SETTING.UPDATE_LINK, '', 'Filled in by setup.'],
    [SETTING.REQUEST_TEMPLATE, '', 'Filled in by setup. The website replaces XLISTINGIDX with a listing ID and xemailx@harvard.edu with the signed-in email.']
  ];
  var existing = settings_();
  defaults.forEach(function (row) {
    if (!(row[0] in existing)) ss.getSheetByName(TAB.SETTINGS).appendRow(row);
  });
}

function writeHowTo_(ss) {
  var sh = ss.getSheetByName(TAB.HOW);
  if (sh.getLastRow() > 0) return;
  var rows = [
    ['Housing Made EZ: furniture board', ''],
    ['', ''],
    ['How it works', 'Sellers post with the Sell form. Buyers request an item with the Request form. Everyone else ' +
      'happens through links in the emails the script sends: the seller confirms or declines, and both say whether ' +
      'the handoff happened.'],
    ['Listings', 'One row per item. Written by the script; edit only Status if you need to fix something by hand.'],
    ['Requests', 'One row per request. Written by the script.'],
    ['Public', 'Available, requested and reserved items without names, emails or codes. This is the only tab to publish ' +
      'for the website: File > Share > Publish to web > Public > Comma-separated values (.csv).'],
    ['Dashboard', 'Counts of listings and requests by status. "Completed" is the number of items that changed hands.'],
    ['Settings', 'Form links and the timings for reminders and expiry.'],
    ['Log', 'What the script did and when (IDs only, no names or emails).'],
    ['Privacy', 'Listings and Requests hold students\' names and Harvard emails. Share this spreadsheet with the team only, ' +
      'and never publish any tab except Public.'],
    ['Fixing a problem', 'Furniture board menu > Run setup repairs missing tabs, forms and triggers without deleting data.']
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  sh.getRange(3, 1, rows.length - 2, 1).setFontWeight('bold');
  sh.setColumnWidth(1, 160); sh.setColumnWidth(2, 640);
  sh.getRange(1, 2, rows.length, 1).setWrap(true);
}

function writePublic_(ss) {
  var sh = ss.getSheetByName(TAB.PUBLIC);
  sh.getRange('A1').setFormula('=QUERY(Listings!A:' + PUBLIC_LAST_COL +
    ',"select * where T = \'Available\' or T = \'Requested\' or T = \'Reserved\'",1)');
  sh.setFrozenRows(1);
}

function writeDashboard_(ss) {
  var sh = ss.getSheetByName(TAB.DASH);
  var rows = [['Listings by status', 'Count']];
  Object.keys(LISTING_STATUS).forEach(function (k) {
    rows.push([LISTING_STATUS[k], '=COUNTIF(Listings!T:T,A' + (rows.length + 1) + ')']);
  });
  var start = rows.length + 2;
  var reqRows = [['Requests by status', 'Count']];
  Object.keys(REQUEST_STATUS).forEach(function (k) {
    reqRows.push([REQUEST_STATUS[k], '=COUNTIF(Requests!J:J,A' + (start + reqRows.length) + ')']);
  });
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(start, 1, reqRows.length, 2).setValues(reqRows);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold');
  sh.getRange(start, 1, 1, 2).setFontWeight('bold');
  sh.setColumnWidth(1, 200);
}

function getOrCreateForm_(props, key, build) {
  var id = props.getProperty(key);
  if (id) { try { return FormApp.openById(id); } catch (e) { /* deleted: build a new one */ } }
  var form = build();
  props.setProperty(key, form.getId());
  return form;
}

function commonFormSettings_(form, requireLogin, confirmation) {
  form.setConfirmationMessage(confirmation);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  if (requireLogin) { try { form.setRequireLogin(true); } catch (e) { /* only works for Workspace accounts */ } }
}

function harvardEmailItem_(form) {
  var v = FormApp.createTextValidation()
    .setHelpText('Use your Harvard email address (ending in harvard.edu).')
    .requireTextMatchesPattern('[^@\\s]+@([A-Za-z0-9-]+\\.)*[Hh][Aa][Rr][Vv][Aa][Rr][Dd]\\.[Ee][Dd][Uu]').build();
  form.addTextItem().setTitle(Q.EMAIL).setRequired(true).setValidation(v);
}

function numberItem_(form, title, required, help) {
  var v = FormApp.createTextValidation().setHelpText('Enter a number.').requireNumberGreaterThanOrEqualTo(0).build();
  var item = form.addTextItem().setTitle(title).setRequired(required).setValidation(v);
  if (help) item.setHelpText(help);
}

function buildSellForm_(requireLogin) {
  var f = FormApp.create('Furniture board: sell or give away an item');
  f.setDescription('Leaving Harvard? List furniture for incoming students to reserve before they arrive. ' +
    'You will get an email with links to confirm a buyer or take the listing down. Never accept a wire transfer.');
  f.addTextItem().setTitle(Q.ITEM).setRequired(true).setHelpText('For example: Queen bed frame + mattress');
  f.addListItem().setTitle(Q.CATEGORY).setChoiceValues(CATEGORIES).setRequired(true);
  numberItem_(f, Q.PRICE, true);
  f.addMultipleChoiceItem().setTitle(Q.CONDITION).setChoiceValues(CONDITIONS).setRequired(true);
  numberItem_(f, Q.WIDTH, false, 'Needed for furniture so buyers can check it fits through their door.');
  numberItem_(f, Q.DEPTH, false);
  numberItem_(f, Q.HEIGHT, false);
  f.addListItem().setTitle(Q.AREA).setChoiceValues(AREAS).setRequired(true)
    .setHelpText('Neighborhood only. Share the exact address after you confirm a buyer.');
  f.addDateItem().setTitle(Q.FROM).setRequired(true);
  f.addDateItem().setTitle(Q.UNTIL).setRequired(true);
  f.addMultipleChoiceItem().setTitle(Q.HANDOFF).setChoiceValues(HANDOFFS).setRequired(true);
  f.addCheckboxItem().setTitle(Q.PAYMENT).setChoiceValues(PAYMENTS).setRequired(true);
  f.addMultipleChoiceItem().setTitle(Q.BUNDLE).setChoiceValues(['Yes', 'No']).setRequired(true);
  f.addMultipleChoiceItem().setTitle(Q.MOVEDAY).setChoiceValues(['Yes', 'No']).setRequired(true);
  f.addTextItem().setTitle(Q.PICKUP_NOTES).setHelpText('For example: 3rd floor walk-up, no elevator');
  f.addParagraphTextItem().setTitle(Q.DESCRIPTION).setHelpText("What's included, any wear, why you're selling.");
  f.addTextItem().setTitle(Q.PHOTO).setHelpText('A link to a photo (Google Drive, iCloud, etc.) shared so anyone with the link can view it.');
  f.addTextItem().setTitle(Q.NAME).setRequired(true).setHelpText('First name and last initial is enough.');
  harvardEmailItem_(f);
  commonFormSettings_(f, requireLogin, 'Thanks! Check your Harvard email for a confirmation with links to manage your listing.');
  return f;
}

function buildRequestForm_(requireLogin, movingDays) {
  var f = FormApp.create('Furniture board: request an item');
  f.setDescription('Hold an item for your arrival. This is not a payment: you pay the seller only after you have seen it. ' +
    'The seller has a few days to confirm, then you will both get an email introducing you.');
  f.addTextItem().setTitle(Q.LISTING_ID).setRequired(true).setHelpText('Filled in when you click "Request" on the website.');
  f.addTextItem().setTitle(Q.NAME).setRequired(true);
  harvardEmailItem_(f);
  f.addDateItem().setTitle(Q.ARRIVAL).setRequired(true);
  f.addMultipleChoiceItem().setTitle(Q.PICKUP).setChoiceValues([PICKUP_SELF].concat(movingDays)).setRequired(true);
  f.addParagraphTextItem().setTitle(Q.MESSAGE);
  commonFormSettings_(f, requireLogin, "Request sent. We've emailed the seller and will email you when they answer.");
  return f;
}

function buildUpdateForm_(requireLogin) {
  var f = FormApp.create('Furniture board: update a listing or request');
  f.setDescription('You normally reach this form from a link in one of our emails, with everything filled in. Just press Submit.');
  f.addTextItem().setTitle(Q.LISTING_ID).setRequired(true);
  harvardEmailItem_(f);
  f.addTextItem().setTitle(Q.CODE).setRequired(true).setHelpText('Filled in from the link in your email.');
  f.addMultipleChoiceItem().setTitle(Q.ACTION).setRequired(true)
    .setChoiceValues(Object.keys(ACTION).map(function (k) { return ACTION[k]; }));
  commonFormSettings_(f, requireLogin, "Thanks, we've updated the board and emailed you a confirmation.");
  return f;
}

function linkForm_(ss, form, tabName) {
  if (ss.getSheetByName(tabName)) return;
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  var formId = form.getId();
  var sheets = SpreadsheetApp.openById(ss.getId()).getSheets(); // reopen so the new response tab is visible
  for (var i = 0; i < sheets.length; i++) {
    var url = sheets[i].getFormUrl();
    if (url) {
      try { if (FormApp.openByUrl(url).getId() === formId) { sheets[i].setName(tabName); return; } } catch (e) {}
    }
  }
}

function prefill_(form, pairs) {
  var resp = form.createResponse();
  form.getItems().forEach(function (item) {
    pairs.forEach(function (p) {
      if (item.getTitle() !== p[0]) return;
      var t = item.getType();
      if (t === FormApp.ItemType.TEXT) resp.withItemResponse(item.asTextItem().createResponse(p[1]));
      else if (t === FormApp.ItemType.MULTIPLE_CHOICE) resp.withItemResponse(item.asMultipleChoiceItem().createResponse(p[1]));
    });
  });
  return resp.toPrefilledUrl();
}

/* ============================== Responses ============================== */

function onFormSubmit(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = e.range.getSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var values = e.range.getValues()[0];
    var a = {};
    headers.forEach(function (h, i) { a[String(h).trim()] = values[i]; });
    var name = sheet.getName();
    if (name === TAB.SELL_RESP) handleSell_(a);
    else if (name === TAB.REQ_RESP) handleRequest_(a);
    else if (name === TAB.UPD_RESP) handleUpdate_(a);
  } finally {
    lock.releaseLock();
  }
}

function handleSell_(a) {
  var email = clean_(a[Q.EMAIL]).toLowerCase();
  if (!HARVARD_RE.test(email)) { log_('Sell rejected: not a Harvard email', '', '', ''); return; }
  addMissingHeaders_(TAB.LISTINGS, LISTING_COLS);
  var t = table_(TAB.LISTINGS);
  var id = nextId_(t, 'Listing ID', 'F-');
  var code = newCode_();
  var s = settings_();
  var photos = sharePhotos_(a[Q.UPLOAD], id);
  var typed = safeLink_(a[Q.PHOTO]);
  if (typed) photos.push(typed);
  var row = {
    'Listing ID': id, 'Posted': new Date(), 'Item': clean_(a[Q.ITEM]), 'Category': clean_(a[Q.CATEGORY]),
    'Price ($)': num_(a[Q.PRICE]), 'Condition': clean_(a[Q.CONDITION]),
    'Width (in)': num_(a[Q.WIDTH]), 'Depth (in)': num_(a[Q.DEPTH]), 'Height (in)': num_(a[Q.HEIGHT]),
    'Area': clean_(a[Q.AREA]), 'Available from': date_(a[Q.FROM]), 'Pick up by': date_(a[Q.UNTIL]),
    'Handoff if seller has left': clean_(a[Q.HANDOFF]), 'Payment accepted': clean_(a[Q.PAYMENT]),
    'Bundle?': clean_(a[Q.BUNDLE]), 'Moving day OK?': clean_(a[Q.MOVEDAY]), 'Pickup notes': clean_(a[Q.PICKUP_NOTES]),
    'Description': clean_(a[Q.DESCRIPTION]), 'Photo link': photos.join(' '),
    'Status': LISTING_STATUS.AVAILABLE, 'Request link': requestLink_(s, id),
    'Seller name': clean_(a[Q.NAME]), 'Seller Harvard email': email, 'Seller code': code,
    'Active request': '', 'Reminder sent': '', 'Updated': new Date(), 'Photo preview': previewFormula_(photos[0])
  };
  t.append(row);
  if (photos.length) { var lsh = SpreadsheetApp.getActive().getSheetByName(TAB.LISTINGS); lsh.setRowHeight(lsh.getLastRow(), 90); }
  log_('Listing posted', id, '', photos.length ? photos.length + ' photo(s)' : '');
  mail_(email, 'Your listing is live: ' + row['Item'] + ' (' + id + ')',
    p_('Hi ' + firstName_(row['Seller name']) + ',') +
    p_('Your item is on the furniture board. When someone requests it, we\'ll email you to confirm or decline.') +
    summary_(row) +
    p_('Manage your listing:') +
    links_([[ACTION.SOLD, actionLink_(s, ACTION.SOLD, id, email, code)], [ACTION.WITHDRAW, actionLink_(s, ACTION.WITHDRAW, id, email, code)]]) +
    p_("Didn't post this? Use \"" + ACTION.WITHDRAW + '" above to take it down.'));
}

function handleRequest_(a) {
  var email = clean_(a[Q.EMAIL]).toLowerCase();
  if (!HARVARD_RE.test(email)) { log_('Request rejected: not a Harvard email', '', '', ''); return; }
  var s = settings_();
  var listingId = clean_(a[Q.LISTING_ID]).toUpperCase();
  var buyerName = clean_(a[Q.NAME]);
  var arrival = date_(a[Q.ARRIVAL]);
  var lt = table_(TAB.LISTINGS);
  var listing = lt.find('Listing ID', listingId);

  var problem = '';
  if (!listing) problem = 'We couldn\'t find listing ' + listingId + '. Please use the "Request" button on the website.';
  else if (listing.get('Status') !== LISTING_STATUS.AVAILABLE) problem = '"' + listing.get('Item') + '" is no longer available. Someone may have requested it first.';
  else if (arrival && listing.get('Pick up by') && arrival > listing.get('Pick up by'))
    problem = 'The seller needs "' + listing.get('Item') + '" picked up by ' + fmt_(listing.get('Pick up by')) +
      ', before you arrive. Your request was not sent.';
  if (problem) {
    log_('Request not accepted', listingId, '', problem.indexOf('find') >= 0 ? 'unknown listing' : 'unavailable or too late');
    mail_(email, 'Your furniture request', p_('Hi ' + firstName_(buyerName) + ',') + p_(problem) +
      (s[SETTING.SITE] ? p_('See what else is available: ' + a_(s[SETTING.SITE], s[SETTING.SITE])) : ''));
    return;
  }

  var rt = table_(TAB.REQUESTS);
  var reqId = nextId_(rt, 'Request ID', 'R-');
  var buyerCode = newCode_();
  var row = {
    'Request ID': reqId, 'Received': new Date(), 'Listing ID': listingId, 'Item': listing.get('Item'),
    'Buyer name': buyerName, 'Buyer Harvard email': email, 'Arrival date': arrival, 'Pickup': clean_(a[Q.PICKUP]),
    'Message': clean_(a[Q.MESSAGE]), 'Status': REQUEST_STATUS.PENDING, 'Buyer code': buyerCode,
    'Seller Harvard email': listing.get('Seller Harvard email'), 'Check sent': '', 'Updated': new Date()
  };
  rt.append(row);
  listing.set({ 'Status': LISTING_STATUS.REQUESTED, 'Active request': reqId, 'Updated': new Date() });
  log_('Request received', listingId, reqId, '');

  var sellerEmail = listing.get('Seller Harvard email'), sellerCode = listing.get('Seller code');
  var days = Number(s[SETTING.REQUEST_DAYS]) || 5;
  mail_(sellerEmail, 'Someone wants your ' + listing.get('Item') + ' (' + listingId + ')',
    p_('Hi ' + firstName_(listing.get('Seller name')) + ',') +
    p_(esc_(buyerName) + ' would like to reserve your item.') +
    ul_([['Arrives in Boston', fmt_(arrival)], ['Pickup', row['Pickup']], ['Message', row['Message'] || 'none']]) +
    p_('Please answer within ' + days + ' days, or the item goes back on the board.') +
    links_([[ACTION.CONFIRM, actionLink_(s, ACTION.CONFIRM, listingId, sellerEmail, sellerCode)],
            [ACTION.DECLINE, actionLink_(s, ACTION.DECLINE, listingId, sellerEmail, sellerCode)]]) +
    p_('When you confirm, we\'ll introduce you to each other by email.'));
  mail_(email, 'Request sent: ' + listing.get('Item') + ' (' + listingId + ')',
    p_('Hi ' + firstName_(buyerName) + ',') +
    p_('We\'ve asked the seller to confirm. They have ' + days + ' days to answer, and we\'ll email you either way.') +
    summary_(listing.toObject()) +
    links_([[ACTION.CANCEL, actionLink_(s, ACTION.CANCEL, listingId, email, buyerCode)]]));
}

function handleUpdate_(a) {
  var s = settings_();
  var listingId = clean_(a[Q.LISTING_ID]).toUpperCase();
  var email = clean_(a[Q.EMAIL]).toLowerCase();
  var code = clean_(a[Q.CODE]).toUpperCase();
  var action = clean_(a[Q.ACTION]);
  var lt = table_(TAB.LISTINGS), rt = table_(TAB.REQUESTS);
  var listing = lt.find('Listing ID', listingId);
  if (!listing) { log_('Update ignored: unknown listing', listingId, '', action); return; }
  var req = listing.get('Active request') ? rt.find('Request ID', listing.get('Active request')) : null;

  var isSeller = email === String(listing.get('Seller Harvard email')).toLowerCase() &&
                 code === String(listing.get('Seller code')).toUpperCase();
  var isBuyer = !!req && email === String(req.get('Buyer Harvard email')).toLowerCase() &&
                code === String(req.get('Buyer code')).toUpperCase();
  var item = listing.get('Item');
  var sellerEmail = listing.get('Seller Harvard email');
  var buyerEmail = req ? req.get('Buyer Harvard email') : '';
  var deny = function (why) {
    log_('Update refused', listingId, req ? req.get('Request ID') : '', action + ': ' + why);
    if (HARVARD_RE.test(email)) mail_(email, 'We couldn\'t update ' + listingId, p_(why) +
      p_('Please use the link from your most recent email about this item.'));
  };
  var now = new Date();

  if (action === ACTION.CONFIRM || action === ACTION.DECLINE) {
    if (!isSeller) return deny('Only the seller can confirm or decline a request.');
    if (!req || req.get('Status') !== REQUEST_STATUS.PENDING) return deny('There is no request waiting for an answer on this item.');
    if (action === ACTION.CONFIRM) {
      req.set({ 'Status': REQUEST_STATUS.CONFIRMED, 'Updated': now });
      listing.set({ 'Status': LISTING_STATUS.RESERVED, 'Updated': now });
      log_('Request confirmed', listingId, req.get('Request ID'), '');
      var intro = p_('Hi ' + firstName_(listing.get('Seller name')) + ' and ' + firstName_(req.get('Buyer name')) + ',') +
        p_('The seller has confirmed. Reply to this email to reach the other person and arrange the pickup.') +
        ul_([['Item', item + ' (' + listingId + ')'], ['Seller', listing.get('Seller name') + ', ' + sellerEmail],
             ['Buyer', req.get('Buyer name') + ', ' + buyerEmail], ['Buyer arrives', fmt_(req.get('Arrival date'))],
             ['Pickup', req.get('Pickup')], ['Must be picked up by', fmt_(listing.get('Pick up by'))],
             ['Payment the seller accepts', listing.get('Payment accepted')]]) +
        p_('Safety: see the item (in person or on a live video call) before paying, and never wire money.');
      // One email each, so "Reply" goes straight to the other person.
      mail_(sellerEmail, 'You\'re matched: ' + item + ' (' + listingId + ')', intro, buyerEmail);
      mail_(buyerEmail, 'You\'re matched: ' + item + ' (' + listingId + ')', intro, sellerEmail);
    } else {
      req.set({ 'Status': REQUEST_STATUS.DECLINED, 'Updated': now });
      listing.set({ 'Status': LISTING_STATUS.AVAILABLE, 'Active request': '', 'Updated': now });
      log_('Request declined', listingId, req.get('Request ID'), '');
      mail_(buyerEmail, 'Update on ' + item, p_('Hi ' + firstName_(req.get('Buyer name')) + ',') +
        p_('The seller can\'t hold "' + esc_(item) + '" for you, so your request has been closed.') +
        (s[SETTING.SITE] ? p_('See what else is available: ' + a_(s[SETTING.SITE], s[SETTING.SITE])) : ''));
    }
    return;
  }

  if (action === ACTION.SOLD || action === ACTION.WITHDRAW) {
    if (!isSeller) return deny('Only the seller can change this listing.');
    var status = action === ACTION.SOLD ? LISTING_STATUS.SOLD : LISTING_STATUS.WITHDRAWN;
    listing.set({ 'Status': status, 'Active request': '', 'Updated': now });
    hidePhotos_(listing);
    log_('Listing ' + status.toLowerCase(), listingId, req ? req.get('Request ID') : '', '');
    if (req && [REQUEST_STATUS.PENDING, REQUEST_STATUS.CONFIRMED].indexOf(req.get('Status')) >= 0) {
      req.set({ 'Status': REQUEST_STATUS.CANCELLED, 'Updated': now });
      mail_(buyerEmail, 'Update on ' + item, p_('Hi ' + firstName_(req.get('Buyer name')) + ',') +
        p_('"' + esc_(item) + '" is no longer available, so your request has been closed. Sorry about that.'));
    }
    mail_(sellerEmail, 'Listing closed: ' + item, p_('Done. "' + esc_(item) + '" is off the board (' + status + ').'));
    return;
  }

  if (action === ACTION.CANCEL) {
    if (!isBuyer) return deny('Only the person who requested this item can cancel the request.');
    if ([REQUEST_STATUS.PENDING, REQUEST_STATUS.CONFIRMED].indexOf(req.get('Status')) < 0) return deny('This request is already closed.');
    req.set({ 'Status': REQUEST_STATUS.CANCELLED, 'Updated': now });
    listing.set({ 'Status': LISTING_STATUS.AVAILABLE, 'Active request': '', 'Updated': now });
    log_('Request cancelled by buyer', listingId, req.get('Request ID'), '');
    mail_(sellerEmail, 'Request cancelled: ' + item, p_('Hi ' + firstName_(listing.get('Seller name')) + ',') +
      p_('The buyer cancelled their request, so "' + esc_(item) + '" is back on the board.'));
    mail_(buyerEmail, 'Request cancelled: ' + item, p_('Your request has been cancelled.'));
    return;
  }

  if (action === ACTION.DONE || action === ACTION.NOT_DONE) {
    if (!isSeller && !isBuyer) return deny('Only the buyer or seller can report on this handoff.');
    if (!req || req.get('Status') !== REQUEST_STATUS.CONFIRMED) return deny('There is no confirmed handoff on this item.');
    if (action === ACTION.DONE) {
      req.set({ 'Status': REQUEST_STATUS.COMPLETED, 'Updated': now });
      listing.set({ 'Status': LISTING_STATUS.COMPLETED, 'Active request': '', 'Updated': now });
      hidePhotos_(listing);
      log_('Handoff completed', listingId, req.get('Request ID'), isSeller ? 'reported by seller' : 'reported by buyer');
      mail_([sellerEmail, buyerEmail], 'Handoff recorded: ' + item, p_('Thanks for using the furniture board. We\'ve marked "' +
        esc_(item) + '" as handed over.'));
    } else {
      var stillTime = listing.get('Pick up by') && startOfDay_(now) <= startOfDay_(listing.get('Pick up by'));
      req.set({ 'Status': REQUEST_STATUS.NOT_COMPLETED, 'Updated': now });
      listing.set({ 'Status': stillTime ? LISTING_STATUS.AVAILABLE : LISTING_STATUS.EXPIRED, 'Active request': '', 'Updated': now });
      if (!stillTime) hidePhotos_(listing);
      log_('Handoff did not happen', listingId, req.get('Request ID'), isSeller ? 'reported by seller' : 'reported by buyer');
      mail_([sellerEmail, buyerEmail], 'Handoff not completed: ' + item,
        p_('We\'ve closed this match. ' + (stillTime ? '"' + esc_(item) + '" is back on the board until ' + fmt_(listing.get('Pick up by')) + '.'
          : 'The pick-up-by date has passed, so the listing has ended.')));
    }
    return;
  }
  deny('We didn\'t recognise that action.');
}

/* ============================== Daily check ============================== */

function dailyCheck() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var s = settings_();
    var today = startOfDay_(new Date());
    var requestDays = Number(s[SETTING.REQUEST_DAYS]) || 5;
    var remindDays = Number(s[SETTING.REMIND_DAYS]) || 3;
    var checkDays = Number(s[SETTING.CHECK_DAYS]) || 2;
    var lt = table_(TAB.LISTINGS), rt = table_(TAB.REQUESTS);

    // 1. Requests the seller never answered go back on the board.
    rt.rows().forEach(function (req) {
      if (req.get('Status') !== REQUEST_STATUS.PENDING) return;
      if (daysBetween_(req.get('Received'), today) < requestDays) return;
      var listing = lt.find('Listing ID', req.get('Listing ID'));
      req.set({ 'Status': REQUEST_STATUS.RELEASED, 'Updated': new Date() });
      if (listing && listing.get('Active request') === req.get('Request ID')) {
        listing.set({ 'Status': LISTING_STATUS.AVAILABLE, 'Active request': '', 'Updated': new Date() });
      }
      log_('Request released (no reply)', req.get('Listing ID'), req.get('Request ID'), '');
      mail_(req.get('Buyer Harvard email'), 'No answer yet on ' + req.get('Item'),
        p_('Hi ' + firstName_(req.get('Buyer name')) + ',') +
        p_('The seller hasn\'t answered in ' + requestDays + ' days, so we\'ve closed your request. You\'re welcome to request it again or pick something else.'));
      if (listing) mail_(listing.get('Seller Harvard email'), 'Request released: ' + req.get('Item'),
        p_('A request for "' + esc_(req.get('Item')) + '" waited ' + requestDays + ' days without an answer, so the item is back on the board.'));
    });

    // 2. Reminders, expiry, and "did the handoff happen?"
    lt.rows().forEach(function (listing) {
      var status = listing.get('Status');
      var until = listing.get('Pick up by');
      var id = listing.get('Listing ID');
      var sellerEmail = listing.get('Seller Harvard email'), code = listing.get('Seller code');
      if (!until) return;
      var daysLeft = daysBetween_(today, until);

      if ((status === LISTING_STATUS.AVAILABLE || status === LISTING_STATUS.REQUESTED) && daysLeft < 0) {
        var req = listing.get('Active request') ? rt.find('Request ID', listing.get('Active request')) : null;
        listing.set({ 'Status': LISTING_STATUS.EXPIRED, 'Active request': '', 'Updated': new Date() });
        hidePhotos_(listing);
        if (req && req.get('Status') === REQUEST_STATUS.PENDING) req.set({ 'Status': REQUEST_STATUS.RELEASED, 'Updated': new Date() });
        log_('Listing expired', id, req ? req.get('Request ID') : '', '');
        mail_(sellerEmail, 'Listing ended: ' + listing.get('Item'),
          p_('The pick-up-by date for "' + esc_(listing.get('Item')) + '" has passed, so it\'s off the board.'));
        return;
      }
      if (status === LISTING_STATUS.AVAILABLE && daysLeft >= 0 && daysLeft <= remindDays && !listing.get('Reminder sent')) {
        listing.set({ 'Reminder sent': new Date() });
        log_('Reminder sent', id, '', '');
        mail_(sellerEmail, 'Still available? ' + listing.get('Item'),
          p_('Hi ' + firstName_(listing.get('Seller name')) + ',') +
          p_('"' + esc_(listing.get('Item')) + '" must be picked up by ' + fmt_(until) + '. If it\'s gone, please take it off the board:') +
          links_([[ACTION.SOLD, actionLink_(s, ACTION.SOLD, id, sellerEmail, code)], [ACTION.WITHDRAW, actionLink_(s, ACTION.WITHDRAW, id, sellerEmail, code)]]));
      }
      if (status === LISTING_STATUS.RESERVED && listing.get('Active request')) {
        var r = rt.find('Request ID', listing.get('Active request'));
        if (!r || r.get('Check sent') || r.get('Status') !== REQUEST_STATUS.CONFIRMED) return;
        var due = r.get('Arrival date') ? daysBetween_(r.get('Arrival date'), today) >= checkDays : daysLeft < 0;
        if (!due && daysLeft >= 0) return;
        r.set({ 'Check sent': new Date() });
        log_('Handoff check sent', id, r.get('Request ID'), '');
        [[sellerEmail, code, listing.get('Seller name')], [r.get('Buyer Harvard email'), r.get('Buyer code'), r.get('Buyer name')]].forEach(function (who) {
          mail_(who[0], 'Did the handoff happen? ' + listing.get('Item'),
            p_('Hi ' + firstName_(who[2]) + ',') + p_('Did "' + esc_(listing.get('Item')) + '" change hands?') +
            links_([[ACTION.DONE, actionLink_(s, ACTION.DONE, id, who[0], who[1])], [ACTION.NOT_DONE, actionLink_(s, ACTION.NOT_DONE, id, who[0], who[1])]]));
        });
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/* ============================== Sheet helpers ============================== */

/** A small wrapper that reads and writes rows by column name. */
function table_(tabName) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tabName);
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });
  function rowObj(rowNumber, values) {
    return {
      get: function (col) { return values[idx[col]]; },
      set: function (changes) {
        Object.keys(changes).forEach(function (col) {
          if (!(col in idx)) throw new Error('Unknown column "' + col + '" on ' + tabName);
          values[idx[col]] = changes[col];
          sh.getRange(rowNumber, idx[col] + 1).setValue(changes[col]);
        });
      },
      toObject: function () { var o = {}; headers.forEach(function (h, i) { o[h] = values[i]; }); return o; }
    };
  }
  return {
    rows: function () {
      var n = sh.getLastRow() - 1;
      if (n < 1) return [];
      return sh.getRange(2, 1, n, lastCol).getValues().map(function (v, i) { return rowObj(i + 2, v); });
    },
    find: function (col, value) {
      var rows = this.rows();
      for (var i = 0; i < rows.length; i++) if (String(rows[i].get(col)).toUpperCase() === String(value).toUpperCase()) return rows[i];
      return null;
    },
    append: function (obj) {
      sh.appendRow(headers.map(function (h) { return h in obj ? obj[h] : ''; }));
    },
    column: function (col) { return this.rows().map(function (r) { return r.get(col); }); }
  };
}

function nextId_(t, col, prefix) {
  var max = 0;
  t.column(col).forEach(function (v) {
    var n = parseInt(String(v).replace(prefix, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return prefix + ('00' + (max + 1)).slice(-Math.max(3, String(max + 1).length));
}

function settings_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(TAB.SETTINGS);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { if (r[0] !== '') out[String(r[0])] = r[1]; });
  return out;
}

function setSetting_(key, value) {
  var sh = SpreadsheetApp.getActive().getSheetByName(TAB.SETTINGS);
  var n = sh.getLastRow();
  if (n >= 2) {
    var keys = sh.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) { sh.getRange(i + 2, 2).setValue(value); return; }
    }
  }
  sh.appendRow([key, value, 'Filled in by setup.']);
}

function log_(event, listingId, requestId, detail) {
  var sh = SpreadsheetApp.getActive().getSheetByName(TAB.LOG);
  if (sh) sh.appendRow([new Date(), event, listingId || '', requestId || '', detail || '']);
}

/* ============================== Value helpers ============================== */

/** Text from a form answer, trimmed, and never treated as a formula when written to the sheet. */
function clean_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 1000);
}
function num_(v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? '' : n; }
function date_(v) {
  if (v instanceof Date) return v;
  if (!v) return '';
  var d = new Date(v);
  return isNaN(d.getTime()) ? '' : d;
}
function safeLink_(v) { var s = String(v || '').trim(); return /^https:\/\/\S+$/i.test(s) ? s : ''; }
function newCode_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }
function startOfDay_(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysBetween_(from, to) { return Math.round((startOfDay_(to) - startOfDay_(from)) / 86400000); }
function fmt_(d) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'EEE, MMM d, yyyy');
}
function firstName_(name) { return esc_(String(name || 'there').replace(/^'/, '').split(/\s+/)[0]); }
/** Replaces placeholders in a prefilled link. Each placeholder may appear raw or URL-encoded. */
function fill_(template, values) {
  var out = String(template || '');
  Object.keys(values).forEach(function (k) {
    var v = encodeURIComponent(values[k]);
    out = out.split(encodeURIComponent(k)).join(v).split(k).join(v);
  });
  return out;
}
function actionLink_(s, action, listingId, email, code) {
  var v = {}; v[PH.LISTING] = listingId; v[PH.EMAIL] = email; v[PH.CODE] = code;
  return fill_(s[actionTemplateKey_(action)], v);
}
function requestLink_(s, listingId) { var v = {}; v[PH.LISTING] = listingId; v[PH.EMAIL] = ''; return fill_(s[SETTING.REQUEST_TEMPLATE], v); }

/* ============================== Photo helpers ============================== */

/** Google Drive file IDs in a form answer (upload answers are Drive links separated by commas). */
function driveIds_(v) {
  var out = [], re = /(?:[?&]id=|\/d\/)([A-Za-z0-9_-]{20,})/g, m;
  while ((m = re.exec(String(v || '')))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
}

/** Renames uploaded photos to the listing ID and makes them viewable by link. Returns their links (max 3). */
function sharePhotos_(answer, listingId) {
  var links = [];
  driveIds_(answer).slice(0, 3).forEach(function (fid, i) {
    try {
      var f = DriveApp.getFileById(fid);
      var ext = (String(f.getName()).match(/\.[A-Za-z0-9]{2,5}$/) || [''])[0].toLowerCase();
      f.setName(listingId + '-' + (i + 1) + ext); // uploads are named after the sender; this removes the name
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      links.push('https://drive.google.com/file/d/' + fid + '/view');
    } catch (e) {
      log_('Photo could not be shared', listingId, '', String(e.message || e).slice(0, 120));
    }
  });
  return links;
}

/** Makes a listing's uploaded photos private again once it is off the board. */
function hidePhotos_(listing) {
  driveIds_(listing.get('Photo link')).forEach(function (fid) {
    try { DriveApp.getFileById(fid).setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); }
    catch (e) { log_('Photo could not be made private', listing.get('Listing ID'), '', String(e.message || e).slice(0, 120)); }
  });
}

/** An image URL for a photo link: Drive links become a thumbnail, other https links are used as they are. */
function photoUrl_(link, width) {
  var ids = driveIds_(link);
  if (ids.length) return 'https://drive.google.com/thumbnail?id=' + ids[0] + '&sz=w' + (width || 400);
  return safeLink_(link);
}
function previewFormula_(link) {
  var url = link ? photoUrl_(link, 400) : '';
  return url ? '=IMAGE("' + url.replace(/"/g, '%22') + '")' : '';
}

/* ============================== Email helpers ============================== */

function esc_(v) {
  return String(v === null || v === undefined ? '' : v).replace(/^'/, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function p_(html) { return '<p>' + html + '</p>'; }
function a_(href, text) { return '<a href="' + esc_(href) + '">' + esc_(text) + '</a>'; }
function ul_(pairs) {
  return '<ul>' + pairs.map(function (p) { return '<li><b>' + esc_(p[0]) + ':</b> ' + esc_(p[1] instanceof Date ? fmt_(p[1]) : p[1]) + '</li>'; }).join('') + '</ul>';
}
function links_(pairs) {
  return '<p>' + pairs.filter(function (p) { return p[1]; }).map(function (p) { return '&rarr; ' + a_(p[1], p[0]); }).join('<br>') + '</p>';
}
function summary_(row) {
  var size = [row['Width (in)'], row['Depth (in)'], row['Height (in)']].filter(function (x) { return x !== ''; }).join(' × ');
  return ul_([['Item', row['Item'] + ' (' + row['Listing ID'] + ')'],
    ['Price', Number(row['Price ($)']) === 0 ? 'Free' : '$' + row['Price ($)']],
    ['Area', row['Area']], ['Size (in)', size || 'not given'],
    ['Available', fmt_(row['Available from']) + ' to ' + fmt_(row['Pick up by'])]]);
}

function mail_(to, subject, html, replyTo) {
  var recipients = (Array.isArray(to) ? to : [to]).filter(function (x) { return HARVARD_RE.test(String(x)); });
  if (!recipients.length) return;
  var s = settings_();
  var team = String(s[SETTING.TEAM_EMAIL] || '').trim();
  var footer = '<hr><p style="color:#666;font-size:12px">' + MAIL_NAME + ' · Housing Made EZ, Harvard Kennedy School.' +
    (team ? ' Questions? Contact ' + esc_(team) + '.' : '') + ' Never pay before you have seen the item, and never wire money.</p>';
  var msg = { to: recipients.join(','), subject: subject.replace(/'/g, '\u2019'), htmlBody: html + footer, name: MAIL_NAME };
  // Introductions reply to the other person; other emails reply to the team, if a team address is set.
  if (replyTo && HARVARD_RE.test(String(replyTo))) msg.replyTo = replyTo; else if (/@/.test(team)) msg.replyTo = team;
  MailApp.sendEmail(msg);
}
