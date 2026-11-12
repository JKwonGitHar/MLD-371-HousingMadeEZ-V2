// Minimal mocks of the Google Apps Script services Code.gs uses, then end-to-end scenarios.
const fs = require('fs'), vm = require('vm'), assert = require('assert');

function colIndex(letters) { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }
class Range {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sheet.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } out.push(row); } return out; }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sheet.put(this.r + i, this.c + j, x))); return this; }
  setValue(x) { this.sheet.put(this.r, this.c, x); return this; }
  setFormula(f) { this.sheet.put(this.r, this.c, f); return this; }
  getSheet() { return this.sheet; }
}
['setFontWeight', 'setBackground', 'setFontColor', 'setFontSize', 'setWrap'].forEach(m => Range.prototype[m] = function () { return this; });
class Sheet {
  constructor(name) { this.name = name; this.data = []; this.formUrl = null; }
  getName() { return this.name; } setName(n) { this.name = n; return this; }
  put(r, c, x) { while (this.data.length < r) this.data.push([]); const row = this.data[r - 1]; while (row.length < c) row.push(''); row[c - 1] = x; }
  getLastRow() { let n = 0; this.data.forEach((row, i) => { if (row.some(v => v !== '' && v !== undefined)) n = i + 1; }); return n; }
  getLastColumn() { return Math.max(0, ...this.data.map(r => r.length)); }
  getRange(a, b, c, d) {
    if (typeof a === 'string') { const m = a.match(/^([A-Z]+)(\d+)$/); return new Range(this, +m[2], colIndex(m[1]), 1, 1); }
    return new Range(this, a, b, c || 1, d || 1);
  }
  appendRow(row) { const r = this.getLastRow() + 1; row.forEach((x, j) => this.put(r, j + 1, x)); }
  setFrozenRows() {} setColumnWidth() {}
  deleteRow(r) { this.data.splice(r - 1, 1); }
  getFormUrl() { return this.formUrl; }
}
class Spreadsheet {
  constructor() { this.sheets = [new Sheet('Sheet1')]; }
  getId() { return 'SS1'; }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; } setActiveSheet() {}
}
const ss = new Spreadsheet();
const forms = {}; let formCount = 0, respSheetCount = 0;
function item(type, form) {
  const it = { type, title: '', choices: [], id: ++form.itemSeq,
    setTitle(t) { this.title = t; return this; }, setRequired() { return this; }, setHelpText() { return this; },
    setValidation() { return this; }, setChoiceValues(v) { this.choices = v; return this; },
    getTitle() { return this.title; }, getType() { return this.type; },
    asTextItem() { return this; }, asMultipleChoiceItem() { return this; },
    createResponse(v) { if (this.type === 'MULTIPLE_CHOICE' && !this.choices.includes(v)) throw new Error('bad choice ' + v); return { id: this.id, v }; } };
  form.items.push(it); return it;
}
function makeForm(title) {
  const id = 'FORM' + (++formCount);
  const f = { id, title, items: [], itemSeq: 100,
    getId() { return id; }, getPublishedUrl() { return 'https://docs.google.com/forms/d/e/' + id + '/viewform'; },
    setDescription() { return this; }, setConfirmationMessage() { return this; }, setAllowResponseEdits() { return this; },
    setShowLinkToRespondAgain() { return this; }, setRequireLogin() { throw new Error('not workspace'); },
    addTextItem() { return item('TEXT', this); }, addListItem() { return item('LIST', this); },
    addMultipleChoiceItem() { return item('MULTIPLE_CHOICE', this); }, addCheckboxItem() { return item('CHECKBOX', this); },
    addDateItem() { return item('DATE', this); }, addParagraphTextItem() { return item('PARAGRAPH_TEXT', this); },
    getItems() { return this.items; },
    setDestination() { const s = ss.insertSheet('Form Responses ' + (++respSheetCount)); s.formUrl = 'https://docs.google.com/forms/d/' + id + '/edit';
      s.appendRow(['Timestamp'].concat(this.items.map(i => i.title))); this.sheet = s; return this; },
    createResponse() { const parts = []; return { withItemResponse(r) { parts.push(r); return this; },
      toPrefilledUrl() { return f.getPublishedUrl() + '?usp=pp_url' + parts.map(p => '&entry.' + p.id + '=' + encodeURIComponent(p.v)).join(''); } }; }
  };
  forms[id] = f; return f;
}
const mails = []; let uuid = 0;
const props = {};
const ctx = {
  console, Date, Math, JSON, String, Number, Object, Array, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, RegExp,
  SpreadsheetApp: { getActive: () => ss, openById: () => ss, flush() {}, getUi() { throw new Error('no ui'); } },
  FormApp: { create: makeForm, openById: id => { if (!forms[id]) throw new Error('gone'); return forms[id]; },
    openByUrl: url => forms[url.match(/FORM\d+/)[0]],
    createTextValidation() { const b = { setHelpText() { return b; }, requireTextMatchesPattern(p) { b.p = p; return b; }, requireNumberGreaterThanOrEqualTo() { return b; }, build() { return b; } }; return b; },
    DestinationType: { SPREADSHEET: 'SPREADSHEET' }, ItemType: { TEXT: 'TEXT', MULTIPLE_CHOICE: 'MULTIPLE_CHOICE' } },
  ScriptApp: { triggers: [], getProjectTriggers() { return this.triggers; }, deleteTrigger(t) { this.triggers = this.triggers.filter(x => x !== t); },
    newTrigger(fn) { const self = this; const t = { getHandlerFunction: () => fn }; const chain = { forSpreadsheet() { return chain; }, onFormSubmit() { return chain; }, timeBased() { return chain; }, everyDays() { return chain; }, atHour() { return chain; }, create() { self.triggers.push(t); return t; } }; return chain; } },
  PropertiesService: { getDocumentProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  MailApp: { sendEmail: m => mails.push(m) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { getUuid: () => ('abcdef12-3456-7890-abcd-' + String(++uuid).padStart(12, '0')), formatDate: d => d.toISOString().slice(0, 10) },
  Session: { getScriptTimeZone: () => 'America/New_York' }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../Code.gs', 'utf8'), ctx);

// ---------- helpers ----------
const tab = n => ss.getSheetByName(n);
const rowsOf = n => { const s = tab(n); const [h, ...r] = s.data; return r.filter(x => x.some(v => v !== '')).map(x => Object.fromEntries(h.map((k, i) => [k, x[i]]))); };
function submit(tabName, answers) {
  const s = tab(tabName); const h = s.data[0];
  s.appendRow(h.map(k => k === 'Timestamp' ? new Date() : (k in answers ? answers[k] : '')));
  ctx.onFormSubmit({ range: s.getRange(s.getLastRow(), 1, 1, h.length) });
}
// Turn a prefilled link from an email into form answers (what the person would submit).
function answersFromLink(url) {
  const f = forms[url.match(/FORM\d+/)[0]]; const q = new URL(url).searchParams; const out = {};
  for (const [k, v] of q) if (k.startsWith('entry.')) out[f.items.find(i => i.id === +k.slice(6)).title] = v;
  return out;
}
const linksIn = html => [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
const last = () => mails[mails.length - 1];
const Q = ctx.Q, A = ctx.ACTION;
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const inDays = n => daysAgo(-n);
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ✓ ' + m); };

// ---------- 1. setup ----------
console.log('Setup');
ctx.setup();
ok(['How to use', 'Listings', 'Requests', 'Public', 'Dashboard', 'Settings', 'Log', 'Sell responses', 'Request responses', 'Update responses'].every(n => tab(n)), 'all tabs exist, Sheet1 reused');
ok(!tab('Sheet1') && Object.keys(forms).length === 3, 'three forms created');
const S = ctx.settings_();
ok(S['Request link template'].includes('XLISTINGIDX'), 'request link template saved');
ok(S['Update link: Confirm the request'].includes('xemailx%40harvard.edu'), 'update templates saved with placeholders');
ok(ctx.ScriptApp.triggers.length === 2, 'two triggers installed');
ok(tab('Public').data[0][0].startsWith('=QUERY(Listings!A:U'), 'Public tab is a query of public columns only');
ctx.setup();
ok(Object.keys(forms).length === 3 && ctx.ScriptApp.triggers.length === 2 && rowsOf('Settings').filter(r => r.Setting === 'Sell form link').length === 1, 'running setup again repairs without duplicating');

// ---------- 2. posting ----------
console.log('Posting');
const sell = { [Q.ITEM]: 'Desk + chair', [Q.CATEGORY]: 'Desks & chairs', [Q.PRICE]: '60', [Q.CONDITION]: 'Good', [Q.WIDTH]: '47', [Q.DEPTH]: '24', [Q.HEIGHT]: '',
  [Q.AREA]: 'Allston / Brighton', [Q.FROM]: daysAgo(1), [Q.UNTIL]: inDays(30), [Q.HANDOFF]: "It'll be in storage", [Q.PAYMENT]: 'Cash at pickup, Venmo / Zelle',
  [Q.BUNDLE]: 'Yes', [Q.MOVEDAY]: 'Yes', [Q.PICKUP_NOTES]: 'Storage unit', [Q.DESCRIPTION]: 'Small scratch', [Q.PHOTO]: 'https://example.com/p.jpg',
  [Q.NAME]: 'Seller Sam', [Q.EMAIL]: 'Sam@HKS.Harvard.edu' };
submit('Sell responses', sell);
let L = rowsOf('Listings');
ok(L.length === 1 && L[0]['Listing ID'] === 'F-001' && L[0].Status === 'Available', 'listing F-001 created as Available');
ok(L[0]['Seller Harvard email'] === 'sam@hks.harvard.edu' && /^[A-F0-9]{8}$/.test(L[0]['Seller code']), 'email lower-cased, seller code generated');
ok(L[0]['Request link'].includes('F-001') && !/XLISTINGIDX|xemailx/.test(L[0]['Request link']), 'request link filled for the listing (no placeholders left)');
ok(S['Request link template'].includes('xemailx%40harvard.edu'), 'request template can prefill the signed-in email');
ok(last().to === 'sam@hks.harvard.edu' && /live/.test(last().subject), 'seller gets a confirmation email');
const sellerLinks = linksIn(last().htmlBody);
ok(sellerLinks.length === 2 && answersFromLink(sellerLinks[0])[Q.EMAIL] === 'sam@hks.harvard.edu', 'confirmation has manage links prefilled with the seller email');
submit('Sell responses', Object.assign({}, sell, { [Q.ITEM]: '=HYPERLINK("http://evil","x")', [Q.EMAIL]: 'pat@college.harvard.edu', [Q.NAME]: 'Pat', [Q.PHOTO]: 'javascript:alert(1)' }));
L = rowsOf('Listings');
ok(L[1].Item.startsWith("'=") && L[1]['Photo link'] === '', 'formula-looking text is stored as text; unsafe photo link dropped');
const before = mails.length;
submit('Sell responses', Object.assign({}, sell, { [Q.EMAIL]: 'someone@gmail.com' }));
ok(rowsOf('Listings').length === 2 && mails.length === before, 'non-Harvard seller is ignored');

// ---------- 3. request, confirm, handoff ----------
console.log('Request and confirm');
const reqAns = (id, email, extra) => Object.assign({ [Q.LISTING_ID]: id, [Q.NAME]: 'Buyer Bo', [Q.EMAIL]: email, [Q.ARRIVAL]: inDays(10), [Q.PICKUP]: "I'll pick it up myself", [Q.MESSAGE]: 'Hi!' }, extra || {});
let m0 = mails.length;
submit('Request responses', reqAns('f-001', 'bo@hks.harvard.edu'));
let R = rowsOf('Requests'); L = rowsOf('Listings');
ok(R.length === 1 && R[0]['Request ID'] === 'R-001' && R[0].Status === 'Pending', 'request R-001 pending (listing ID case-insensitive)');
ok(L[0].Status === 'Requested' && L[0]['Active request'] === 'R-001', 'listing held as Requested');
const toSeller = mails.slice(m0).find(m => m.to === 'sam@hks.harvard.edu'), toBuyer = mails.slice(m0).find(m => m.to === 'bo@hks.harvard.edu');
ok(toSeller && toBuyer, 'seller and buyer both emailed');
ok(!toSeller.htmlBody.includes('bo@hks.harvard.edu') && !toBuyer.htmlBody.includes('sam@hks.harvard.edu'), 'emails are not shared before the seller confirms');
m0 = mails.length;
submit('Request responses', reqAns('F-001', 'cy@hks.harvard.edu'));
ok(rowsOf('Requests').length === 1 && /no longer available/.test(mails[m0].htmlBody), 'second buyer told it is no longer available');
m0 = mails.length;
submit('Request responses', reqAns('F-002', 'cy@hks.harvard.edu', { [Q.ARRIVAL]: inDays(60) }));
ok(rowsOf('Requests').length === 1 && /before you arrive/.test(mails[m0].htmlBody), 'buyer arriving after pick-up-by is turned away');

// someone without the code tries to confirm
const confirmLink = linksIn(toSeller.htmlBody).find(u => answersFromLink(u)[Q.ACTION] === A.CONFIRM);
const forged = Object.assign(answersFromLink(confirmLink), { [Q.CODE]: 'WRONG123' });
submit('Update responses', forged);
ok(rowsOf('Listings')[0].Status === 'Requested', 'wrong code cannot confirm');
const buyerCancel = linksIn(toBuyer.htmlBody)[0];
submit('Update responses', Object.assign(answersFromLink(buyerCancel), { [Q.ACTION]: A.CONFIRM }));
ok(rowsOf('Listings')[0].Status === 'Requested', 'buyer cannot confirm their own request');

m0 = mails.length;
submit('Update responses', answersFromLink(confirmLink));
R = rowsOf('Requests'); L = rowsOf('Listings');
ok(R[0].Status === 'Confirmed' && L[0].Status === 'Reserved', 'seller confirms: request Confirmed, listing Reserved');
const introS = mails[m0], introB = mails[m0 + 1];
ok(introS.to === 'sam@hks.harvard.edu' && introS.replyTo === 'bo@hks.harvard.edu' && introB.to === 'bo@hks.harvard.edu' && introB.replyTo === 'sam@hks.harvard.edu' && introB.htmlBody.includes('sam@hks.harvard.edu'), 'each gets an introduction; Reply goes to the other person');

// daily check before arrival: nothing happens
m0 = mails.length; ctx.dailyCheck();
ok(mails.length === m0, 'daily check does nothing before the buyer arrives');
// buyer arrived 3 days ago -> handoff check
tab('Requests').getRange(2, 7).setValue(daysAgo(3));
m0 = mails.length; ctx.dailyCheck();
ok(mails.length - m0 === 2 && rowsOf('Requests')[0]['Check sent'] !== '', '"did the handoff happen?" sent once to each');
ctx.dailyCheck();
ok(mails.length - m0 === 2, 'handoff check is not repeated');
const doneLink = linksIn(mails[m0 + 1].htmlBody).find(u => answersFromLink(u)[Q.ACTION] === A.DONE);
submit('Update responses', answersFromLink(doneLink));
ok(rowsOf('Requests')[0].Status === 'Completed' && rowsOf('Listings')[0].Status === 'Completed', 'buyer reports handoff: Completed');

// ---------- 4. release, cancel, decline, withdraw, reminders, expiry ----------
console.log('Daily check and other actions');
submit('Sell responses', Object.assign({}, sell, { [Q.ITEM]: 'Lamp', [Q.EMAIL]: 'lee@hks.harvard.edu', [Q.NAME]: 'Lee' }));   // F-003
submit('Request responses', reqAns('F-003', 'dee@hks.harvard.edu'));                                                         // R-002
tab('Requests').getRange(3, 2).setValue(daysAgo(6));
ctx.dailyCheck();
ok(rowsOf('Requests')[1].Status === 'Released (no reply)' && rowsOf('Listings')[2].Status === 'Available', 'unanswered request released after 5 days');

m0 = mails.length;
submit('Request responses', reqAns('F-003', 'eve@hks.harvard.edu'));                                                         // R-003
const eveCancel = linksIn(mails.slice(m0).find(m => m.to === 'eve@hks.harvard.edu').htmlBody)[0];
submit('Update responses', answersFromLink(eveCancel));
ok(rowsOf('Requests')[2].Status === 'Cancelled' && rowsOf('Listings')[2].Status === 'Available', 'buyer cancels: item back on the board');

m0 = mails.length;
submit('Request responses', reqAns('F-003', 'fay@hks.harvard.edu'));                                                         // R-004
const leeMail = mails.slice(m0).find(m => m.to === 'lee@hks.harvard.edu');
submit('Update responses', answersFromLink(linksIn(leeMail.htmlBody).find(u => answersFromLink(u)[Q.ACTION] === A.DECLINE)));
ok(rowsOf('Requests')[3].Status === 'Declined' && rowsOf('Listings')[2].Status === 'Available', 'seller declines: item back on the board');

tab('Listings').getRange(4, 12).setValue(inDays(2));     // F-003 pick up by in 2 days
m0 = mails.length; ctx.dailyCheck();
ok(mails.slice(m0).some(m => m.to === 'lee@hks.harvard.edu' && /Still available/.test(m.subject)), 'seller reminded before pick-up-by');
m0 = mails.length; ctx.dailyCheck();
ok(!mails.slice(m0).some(m => /Still available/.test(m.subject)), 'reminder sent only once');
tab('Listings').getRange(4, 12).setValue(daysAgo(1));
ctx.dailyCheck();
ok(rowsOf('Listings')[2].Status === 'Expired', 'listing expires after pick-up-by');

const patLinks = linksIn(mails.find(m => m.to === 'pat@college.harvard.edu').htmlBody);
submit('Update responses', answersFromLink(patLinks.find(u => answersFromLink(u)[Q.ACTION] === A.WITHDRAW)));
ok(rowsOf('Listings')[1].Status === 'Withdrawn', 'seller withdraws a listing');

// ---------- 4b. sample listings ----------
console.log('Sample listings');
const beforeL = rowsOf('Listings').length; let mm = mails.length;
ctx.addSampleListings_('john@hks.harvard.edu');
let SL = rowsOf('Listings').filter(r => r['Seller name'] === 'Sample seller');
ok(SL.length === 7 && rowsOf('Listings').length === beforeL + 7, 'seven sample listings added');
ok(mails.length === mm, 'adding samples sends no email');
ok(SL.every(r => r.Status === 'Available' && /^F-\d{3}$/.test(r['Listing ID']) && r['Request link'].includes(r['Listing ID']) && !/XLISTINGIDX|xemailx/.test(r['Request link'])), 'samples are Available with working request links');
ok(SL.every(r => r['Pick up by'] > r['Available from'] && r.Description.startsWith('Sample listing for testing.')), 'sample dates are in order and marked as samples');
ok(new Set(rowsOf('Listings').map(r => r['Listing ID'])).size === rowsOf('Listings').length, 'listing IDs stay unique');
mm = mails.length;
submit('Request responses', reqAns(SL[0]['Listing ID'], 'gil@hks.harvard.edu', { [Q.ARRIVAL]: new Date(2027, 6, 20) }));
ok(mails.slice(mm).some(m => m.to === 'john@hks.harvard.edu' && /wants your/.test(m.subject)), 'requesting a sample emails the tester as the seller');
ctx.removeSampleListings();
ok(rowsOf('Listings').length === beforeL && !rowsOf('Listings').some(r => r['Seller name'] === 'Sample seller'), 'remove deletes every sample listing and nothing else');
ok(!rowsOf('Requests').some(r => SL.some(x => x['Listing ID'] === r['Listing ID'])), 'requests for samples are removed too');

// ---------- 5. privacy ----------
console.log('Privacy');
const logText = JSON.stringify(tab('Log').data);
ok(!/@/.test(logText), 'log has no email addresses');
ok(mails.every(m => m.to.split(',').every(a => /harvard\.edu$/.test(a))), 'every email went to a Harvard address');
ok(mails.every(m => !/XLISTINGIDX|XCODEX|xemailx/.test(m.htmlBody)), 'no unfilled placeholders in any email');
const dash = tab('Dashboard').data;
ok(dash.some(r => r[0] === 'Completed' && String(r[1]).startsWith('=COUNTIF(Listings!T:T')), 'dashboard counts listings by the Status column (T)');
ok(ctx.LISTING_COLS.indexOf('Status') === 19 && ctx.LISTING_COLS.indexOf('Request link') === 20 && ctx.REQUEST_COLS.indexOf('Status') === 9, 'column letters used in formulas match the headers');

console.log('\n' + pass + ' checks passed, ' + mails.length + ' emails simulated.');
