/* Housing Made EZ: shared script for every page. Each block checks that its section is on the page. */

/* ===== One-time Harvard email sign-in =====
   The first visit shows a sign-in screen. A Harvard address (ending in harvard.edu) is saved in this
   browser, every page opens from then on, and the forms reuse it. This checks the address's ending only;
   it does not confirm the inbox exists. A determined visitor could get around it, so it is a light gate,
   not security. */
(function(){
  var KEY = "hme-harvard-email";
  var RE = /^[^\s@]+@([a-z0-9-]+\.)*harvard\.edu$/i;
  function getEmail(){ try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch(e){ return null; } }
  function setEmail(v){ try { localStorage.setItem(KEY, v); } catch(e){ try { sessionStorage.setItem(KEY, v); } catch(_){} } }
  function clearEmail(){ try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch(e){} }

  function prefill(email){
    ["fs-email", "fr-email", "rm-contact"].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.defaultValue = email; el.value = email;      // defaultValue survives form.reset()
      el.readOnly = true; el.classList.add("from-signin");
      el.title = "From your sign-in. Sign out at the bottom of the page to use another address.";
    });
    var hint = document.getElementById("fs-email") && document.getElementById("fs-email").parentNode.querySelector(".fb-hint");
    if (hint) hint.textContent = "From your sign-in. Sign out at the bottom of the page to use another address.";
    var foot = document.querySelector("main footer");
    if (foot && !document.getElementById("signed-in")){
      var p = document.createElement("p"); p.className = "signed-in"; p.id = "signed-in";
      p.appendChild(document.createTextNode("Signed in as " + email + " · "));
      var out = document.createElement("button"); out.type = "button"; out.textContent = "Sign out";
      out.addEventListener("click", function(){ clearEmail(); location.reload(); });
      p.appendChild(out); foot.insertBefore(p, foot.firstChild);
    }
  }

  var saved = getEmail();
  if (saved){ document.documentElement.classList.remove("gated"); prefill(saved); return; }

  var gate = document.createElement("div");
  gate.id = "gate";
  gate.innerHTML =
    '<div class="gate-card" role="dialog" aria-labelledby="gate-title">' +
      '<div class="brand"><span class="brand-dot"></span>Housing Made EZ</div>' +
      '<h1 id="gate-title">Welcome! Sign in with your Harvard email</h1>' +
      '<p>This site is for the Harvard community. You only need to do this once on this device.</p>' +
      '<form novalidate>' +
        '<div class="field"><label for="gate-email">Harvard email</label>' +
        '<input id="gate-email" type="email" autocomplete="email" required maxlength="80" placeholder="you@hks.harvard.edu"></div>' +
        '<p class="gate-error" id="gate-error" role="alert"></p>' +
        '<button class="btn btn-primary" type="submit">Enter the site</button>' +
      '</form>' +
      '<p class="gate-note">We only check that the address ends in harvard.edu. It stays in this browser and isn’t sent anywhere.</p>' +
    '</div>';
  document.body.insertBefore(gate, document.body.firstChild);
  var input = document.getElementById("gate-email");
  input.addEventListener("input", function(){ document.getElementById("gate-error").textContent = ""; });
  gate.querySelector("form").addEventListener("submit", function(e){
    e.preventDefault();
    var email = input.value.trim();
    if (!RE.test(email)){
      document.getElementById("gate-error").textContent = "Use your Harvard email address (ending in harvard.edu).";
      input.focus(); return;
    }
    setEmail(email);
    gate.remove();
    document.documentElement.classList.remove("gated");
    prefill(email);
    window.scrollTo(0, 0);
  });
  try { input.focus(); } catch(_){}
})();


(function(){
  "use strict";

  /* ============ CHECKLIST DATA ============ */
  var CHECKLIST = [
    {id:"fcu", tag:"both", text:"Start a Harvard FCU membership application online (no SSN needed)"},
    {id:"visa", tag:"international", text:"Confirm your I-20/DS-2019 and visa interview are complete"},
    {id:"temp", tag:"international", text:"Book temporary housing for your first 1–2 weeks before signing a full lease"},
    {id:"mover", tag:"domestic", text:"Reserve a moving container or mover if you're bringing furniture"},
    {id:"verify", tag:"both", text:"Verify any apartment's landlord and unit through the city property database"},
    {id:"travelins", tag:"international", text:"Get travel/health insurance for the gap before Harvard's plan starts"},
    {id:"sim", tag:"international", text:"Arrange a US SIM or eSIM plan for arrival day"},
    {id:"rentersins", tag:"both", text:"Get a renters insurance quote for your new apartment"},
    {id:"cash", tag:"international", text:"Convert some cash to USD and notify your home bank of travel"},
    {id:"movein", tag:"both", text:"Confirm your move-in date and how keys/utilities transfer"},
    {id:"hio", tag:"international", text:"Register your arrival with the Harvard International Office"},
    {id:"address", tag:"domestic", text:"Update your mailing address with USPS, your bank, and employer"}
  ];

  var checklistState = {}; // id -> bool
  var currentFilter = "both";
  var checklistStore = null; // {get, set} once resolved

  function renderChecklist(){
    var list = document.getElementById("checklist-list");
    list.innerHTML = "";
    var visible = CHECKLIST.filter(function(item){
      return currentFilter === "both" || item.tag === "both" || item.tag === currentFilter;
    });
    visible.forEach(function(item){
      var li = document.createElement("li");
      li.className = "check-item" + (checklistState[item.id] ? " done" : "");
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.id = "chk-" + item.id;
      cb.checked = !!checklistState[item.id];
      cb.addEventListener("change", function(){
        checklistState[item.id] = cb.checked;
        persistChecklist();
        renderChecklist();
      });
      var label = document.createElement("label");
      label.setAttribute("for", cb.id);
      label.textContent = item.text;
      var badge = document.createElement("span");
      badge.className = "tag badge " + (item.tag === "international" ? "tag-amber" : item.tag === "domestic" ? "tag-good" : "");
      badge.textContent = item.tag === "both" ? "" : (item.tag === "international" ? "Abroad" : "Domestic");
      if (item.tag === "both") badge.style.display = "none";
      li.appendChild(cb); li.appendChild(label); li.appendChild(badge);
      list.appendChild(li);
    });
    var done = visible.filter(function(i){ return checklistState[i.id]; }).length;
    document.getElementById("progress-label").textContent = done + " / " + visible.length + " done";
    document.getElementById("progress-fill").style.width = (visible.length ? (done/visible.length*100) : 0) + "%";
  }

  document.querySelectorAll("#checklist .seg button").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll(".seg button").forEach(function(b){ b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      currentFilter = btn.getAttribute("data-filter");
      renderChecklist();
    });
  });

  function persistChecklist(){
    try { localStorage.setItem("hme-checklist", JSON.stringify(checklistState)); } catch(e){}
    if (checklistStore) {
      checklistStore.set({ items: checklistState, updatedAt: Date.now() }).catch(function(){});
    }
  }

  function loadLocalChecklist(){
    try {
      var raw = localStorage.getItem("hme-checklist");
      if (raw) checklistState = JSON.parse(raw) || {};
    } catch(e){}
  }

  /* ============ RENT CHART ============ */
  var RENT = [
    {label:"Studio", cambridge:2775, allston:2833},
    {label:"1 Bed", cambridge:3289, allston:2750},
    {label:"2 Bed", cambridge:4173, allston:2900},
    {label:"3 Bed", cambridge:5398, allston:3117}
  ];

  function fmt(n){ return "$" + n.toLocaleString("en-US"); }

  function renderRentChart(){
    var svg = document.getElementById("rent-chart");
    var tip = document.getElementById("bar-tip");
    var W = 640, H = 260, padL = 46, padR = 12, padT = 16, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxVal = Math.max.apply(null, RENT.map(function(r){ return Math.max(r.cambridge, r.allston); }));
    var niceMax = Math.ceil(maxVal / 1000) * 1000;
    var groupW = plotW / RENT.length;
    var barW = groupW * 0.30;

    var css = getComputedStyle(document.documentElement);
    var textSecondary = css.getPropertyValue("--ink-soft").trim() || "#46615A";
    var gridLine = css.getPropertyValue("--line").trim() || "#DDE4D9";
    var camColor = css.getPropertyValue("--series-cambridge").trim() || "#1baf7a";
    var allColor = css.getPropertyValue("--series-allston").trim() || "#eb6834";

    var svgns = "http://www.w3.org/2000/svg";
    function el(tag, attrs){
      var e = document.createElementNS(svgns, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }

    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    // gridlines + y labels
    var steps = 4;
    for (var s = 0; s <= steps; s++){
      var val = niceMax * s / steps;
      var y = padT + plotH - (val / niceMax) * plotH;
      svg.appendChild(el("line", {x1: padL, x2: W - padR, y1: y, y2: y, stroke: gridLine, "stroke-width": 1}));
      var t = el("text", {x: padL - 8, y: y + 4, "text-anchor": "end", "font-size": 10, fill: textSecondary, "font-family": "IBM Plex Mono, monospace"});
      t.textContent = "$" + Math.round(val/1000) + "k";
      svg.appendChild(t);
    }

    RENT.forEach(function(row, i){
      var gx = padL + groupW * i;
      var cx = gx + groupW/2 - barW - 3;
      var ax = gx + groupW/2 + 3;

      [
        {x: cx, val: row.cambridge, color: camColor, name: "Cambridge"},
        {x: ax, val: row.allston, color: allColor, name: "Allston"}
      ].forEach(function(bar){
        var h = (bar.val / niceMax) * plotH;
        var y = padT + plotH - h;
        var rect = el("rect", {x: bar.x, y: y, width: barW, height: h, rx: 4, fill: bar.color});
        rect.style.cursor = "pointer";
        rect.addEventListener("mousemove", function(evt){
          var pt = svg.createSVGPoint();
          var rectBB = svg.getBoundingClientRect();
          pt.x = evt.clientX; pt.y = evt.clientY;
          var relX = evt.clientX - rectBB.left;
          var relY = evt.clientY - rectBB.top;
          tip.style.left = relX + "px";
          tip.style.top = relY + "px";
          tip.textContent = bar.name + " " + row.label + ": " + fmt(bar.val);
          tip.classList.add("show");
        });
        rect.addEventListener("mouseleave", function(){ tip.classList.remove("show"); });
        svg.appendChild(rect);

        var lbl = el("text", {x: bar.x + barW/2, y: y - 6, "text-anchor": "middle", "font-size": 10, fill: textSecondary, "font-family": "IBM Plex Mono, monospace"});
        lbl.textContent = "$" + Math.round(bar.val/100)/10 + "k";
        svg.appendChild(lbl);
      });

      var glabel = el("text", {x: gx + groupW/2, y: H - 10, "text-anchor": "middle", "font-size": 12, fill: textSecondary, "font-family": "Work Sans, sans-serif", "font-weight": 600});
      glabel.textContent = row.label;
      svg.appendChild(glabel);
    });

    // table
    var tbody = document.getElementById("rent-table-body");
    tbody.innerHTML = "";
    RENT.forEach(function(row){
      var tr = document.createElement("tr");
      var diff = row.cambridge - row.allston;
      var diffText = (diff >= 0 ? "+" : "−") + fmt(Math.abs(diff)) + " in Cambridge";
      tr.innerHTML = "<td>" + row.label + "</td><td class='num'>" + fmt(row.cambridge) + "</td><td class='num'>" + fmt(row.allston) + "</td><td class='num'>" + diffText + "</td>";
      tbody.appendChild(tr);
    });
  }

  /* ============ DISTANCE FROM HKS ============ */
  var DISTANCES = [
    {place:"Harvard Square", miles:0.3},
    {place:"Central Square", miles:1.0},
    {place:"Kendall Square", miles:1.4},
    {place:"Porter Square", miles:1.6},
    {place:"Davis Square", miles:2.1},
    {place:"Allston", miles:2.8},
    {place:"Brighton Center", miles:3.6}
  ];
  function renderDistances(){
    var wrap = document.getElementById("dist-strip");
    wrap.innerHTML = "";
    var max = Math.max.apply(null, DISTANCES.map(function(d){ return d.miles; }));
    DISTANCES.forEach(function(d){
      var row = document.createElement("div");
      row.className = "dist-row";
      var pct = (d.miles / max) * 100;
      row.innerHTML = "<span class='place'>" + d.place + "</span>" +
        "<span class='dist-bar-track'><span class='dist-bar-fill' style='width:" + pct + "%'></span></span>" +
        "<span class='val'>" + d.miles.toFixed(1) + " mi</span>";
      wrap.appendChild(row);
    });
  }

  /* ============ ROOMMATE BOARD (db capability) ============ */
  var rmCollection = null;

  function renderRoommates(posts){
    var wrap = document.getElementById("rm-list");
    wrap.innerHTML = "";
    if (!posts.length){
      wrap.innerHTML = "<div class='empty-state'>No listings yet — be the first to post.</div>";
      return;
    }
    posts.forEach(function(p){
      var card = document.createElement("div");
      card.className = "rm-post";
      var when = "";
      try { when = new Date(p.postedAt).toLocaleDateString("en-US", {month:"short", day:"numeric"}); } catch(e){}
      var head = document.createElement("div");
      head.className = "rm-post-head";
      var who = document.createElement("span"); who.className = "who"; who.textContent = p.name || "Someone";
      var wh = document.createElement("span"); wh.className = "when"; wh.textContent = when;
      head.appendChild(who); head.appendChild(wh);
      var meta = document.createElement("div"); meta.className = "rm-meta";
      meta.innerHTML = "<span>Move-in <b></b></span><span>Budget <b></b></span><span>Area <b></b></span>";
      meta.querySelectorAll("b")[0].textContent = p.moveIn || "—";
      meta.querySelectorAll("b")[1].textContent = p.budget || "—";
      meta.querySelectorAll("b")[2].textContent = p.area || "—";
      var note = document.createElement("p");
      note.style.cssText = "margin:6px 0 0; font-size:13.5px; color:var(--ink-soft);";
      note.textContent = p.note || "";
      var contact = document.createElement("p");
      contact.style.cssText = "margin:8px 0 0; font-size:12.5px; color:var(--ink-faint);";
      contact.textContent = "Contact: " + (p.contact || "—");
      card.appendChild(head); card.appendChild(meta);
      if (p.note) card.appendChild(note);
      card.appendChild(contact);
      wrap.appendChild(card);
    });
  }

  function initRoommates(db){
    if (!db){
      document.getElementById("rm-unavailable").hidden = false;
      return;
    }
    document.getElementById("rm-app").hidden = false;
    rmCollection = db.collection("roommate_posts");
    rmCollection.orderBy("postedAt", "desc").limit(50).onSnapshot(function(snap){
      var posts = snap.docs.map(function(d){ return d.data(); });
      renderRoommates(posts);
    }, function(err){
      document.getElementById("rm-app").hidden = true;
      document.getElementById("rm-unavailable").hidden = false;
    });

    var form = document.getElementById("rm-form");
    form.addEventListener("submit", function(e){
      e.preventDefault();
      // Only Harvard addresses can post (checks the domain; it does not confirm the inbox exists).
      var rmErr = document.getElementById("rm-error");
      var contact = document.getElementById("rm-contact").value.trim();
      if (!/^[^\s@]+@([a-z0-9-]+\.)*harvard\.edu$/i.test(contact)){
        if (rmErr) rmErr.textContent = "Use your Harvard email address (ending in harvard.edu).";
        return;
      }
      if (rmErr) rmErr.textContent = "";
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Posting…";
      var data = {
        name: document.getElementById("rm-name").value.trim().slice(0,60),
        contact: document.getElementById("rm-contact").value.trim().slice(0,80),
        moveIn: document.getElementById("rm-movein").value.trim().slice(0,30),
        budget: document.getElementById("rm-budget").value.trim().slice(0,30),
        area: document.getElementById("rm-area").value.trim().slice(0,80),
        note: document.getElementById("rm-note").value.trim().slice(0,280),
        postedAt: Date.now()
      };
      rmCollection.add(data).then(function(){
        form.reset();
      }).catch(function(){
        alert_fallback();
      }).finally(function(){
        btn.disabled = false; btn.textContent = "Post listing";
      });
    });
  }

  function alert_fallback(){
    var note = document.getElementById("checklist-note");
    // reuse a lightweight inline message pattern instead of window.alert
  }

  /* ============ BOOT ============ */
  function start(){
    var hasChecklist = !!document.getElementById("checklist-list");
    if (hasChecklist){ loadLocalChecklist(); renderChecklist(); }
    if (document.getElementById("rent-chart")) renderRentChart();
    if (document.getElementById("dist-strip")) renderDistances();
    var hasRoommates = !!document.getElementById("rm-app");
    if (!hasChecklist && !hasRoommates) return;

    if (window.claude && typeof window.claude.use === "function"){
      Promise.all([
        window.claude.use("db").catch(function(){ return null; }),
        window.claude.use("user").catch(function(){ return null; })
      ]).then(function(results){
        var db = results[0], user = results[1];
        if (hasRoommates) initRoommates(db);

        if (db && user && hasChecklist){
          user.id().then(function(uid){
            if (!uid) return;
            var doc = db.doc("data/users/" + uid + "/checklist");
            checklistStore = doc;
            doc.get().then(function(snap){
              if (snap.exists && snap.data() && snap.data().items){
                checklistState = snap.data().items;
                renderChecklist();
              }
            }).catch(function(){});
          }).catch(function(){});
        }
      });
    } else if (hasRoommates) {
      document.getElementById("rm-unavailable").hidden = false;
    }
  }

  if (window.claude && window.claude.hot){
    window.claude.hot.ready ? window.claude.hot.ready(start) : start(window.claude.hot.data || {});
  } else {
    start();
  }
})();

(function(){
  var root = document.getElementById("verify-agent");
  if (!root) return;
  var answers = {};
  var STEP_TEXT = {
    named:   { no:"The listing names no brokerage, only a phone number.", skip:"Brokerage name not confirmed." },
    license: { no:"No active license found for this agent.", skip:"License not checked yet." },
    phone:   { no:"The brokerage did not confirm the agent or listing, or the phone number doesn't match.", skip:"Brokerage office not called yet." },
    owner:   { no:"The owner on record doesn't match.", skip:"Property owner not checked yet." },
    fees:    { no:"They are asking you for a broker or application fee." }
  };
  function val(id){ var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function echo(){
    var n = val("v-name"), ph = val("v-phone");
    root.querySelectorAll(".v-echo-name").forEach(function(e){ e.textContent = n || "this agent"; });
    root.querySelectorAll(".v-echo-phone").forEach(function(e){ e.textContent = ph ? "the number you were given (" + ph + ")" : "the phone number you were given"; });
  }
  function flags(){ return Array.prototype.map.call(root.querySelectorAll(".vflags input:checked"), function(c){ return c.value; }); }
  function update(){
    echo();
    var problems = [], pending = [];
    ["named","license","phone","owner","fees"].forEach(function(k){
      var a = answers[k];
      if (a === "no") problems.push(STEP_TEXT[k].no);
      else if (a === "skip" || !a) pending.push(STEP_TEXT[k].skip || "Fee question not answered yet.");
    });
    var fl = flags();
    fl.forEach(function(f){ problems.push("Red flag: " + f + "."); });
    var flagStep = root.querySelector('.vstep[data-step="flags"]');
    flagStep.setAttribute("data-state", fl.length ? "no" : "");

    var res = document.getElementById("v-result"), level = document.getElementById("v-level"),
        title = document.getElementById("v-title"), text = document.getElementById("v-text"),
        list = document.getElementById("v-list"), report = document.getElementById("v-report");
    var items;
    if (problems.length){
      res.setAttribute("data-level", "stop");
      level.textContent = "Stop";
      title.textContent = "Don't send money";
      text.textContent = "These are signs of a scam or an illegal fee. Don't pay, don't share documents, and report it if money was requested.";
      items = problems; report.hidden = false;
    } else if (pending.length){
      res.setAttribute("data-level", "wait");
      level.textContent = "Not finished";
      title.textContent = "Keep checking before you pay";
      text.textContent = "Nothing alarming yet, but these checks are still open:";
      items = pending; report.hidden = true;
    } else {
      res.setAttribute("data-level", "ok");
      level.textContent = "Checks passed";
      title.textContent = "This agent checks out so far";
      text.textContent = "Still see the unit (in person or by live video), get a written lease before paying, and never pay by wire transfer or gift card.";
      items = []; report.hidden = true;
    }
    list.innerHTML = "";
    items.forEach(function(t){ var li = document.createElement("li"); li.textContent = t; list.appendChild(li); });
  }
  root.querySelectorAll(".vstep[data-step] .vans").forEach(function(group){
    var step = group.closest(".vstep"), key = step.getAttribute("data-step");
    group.querySelectorAll("button").forEach(function(b){
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function(){
        group.querySelectorAll("button").forEach(function(x){ x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        answers[key] = b.getAttribute("data-v");
        step.setAttribute("data-state", answers[key] === "skip" ? "" : answers[key]);
        update();
      });
    });
  });
  root.querySelectorAll(".vflags input, .verify-fields input").forEach(function(i){ i.addEventListener("input", update); i.addEventListener("change", update); });
  document.getElementById("v-reset").addEventListener("click", function(){
    answers = {};
    root.querySelectorAll(".vans button").forEach(function(b){ b.setAttribute("aria-pressed", "false"); });
    root.querySelectorAll(".vstep").forEach(function(s){ s.setAttribute("data-state", ""); });
    root.querySelectorAll(".vflags input").forEach(function(c){ c.checked = false; });
    root.querySelectorAll(".verify-fields input").forEach(function(i){ i.value = ""; });
    update();
  });
  document.getElementById("v-copy").addEventListener("click", function(){
    var btn = this;
    var lines = ["Housing Made EZ agent check",
      "Agent: " + (val("v-name") || "(not given)"),
      "Brokerage: " + (val("v-firm") || "(not given)"),
      "Phone in listing: " + (val("v-phone") || "(not given)"),
      "Result: " + document.getElementById("v-title").textContent];
    Array.prototype.forEach.call(document.querySelectorAll("#v-list li"), function(li){ lines.push("- " + li.textContent); });
    var text = lines.join("\n");
    function done(msg){ var old = btn.textContent; btn.textContent = msg; setTimeout(function(){ btn.textContent = old; }, 1600); }
    try {
      navigator.clipboard.writeText(text).then(function(){ done("Copied"); }, function(){ fallback(); });
    } catch(e){ fallback(); }
    function fallback(){
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done("Copied"); } catch(e){ done("Select and copy manually"); }
      document.body.removeChild(ta);
    }
  });
  update();
})();

(function(){
  /* Expandable embeds and auto-sizing iframes (LeaseCheck) */
  document.querySelectorAll('[data-expand]').forEach(function(btn){
    var box = document.getElementById(btn.getAttribute('data-expand'));
    if (!box) return;
    btn.addEventListener('click', function(){
      var collapsed = box.classList.toggle('collapsed');
      btn.textContent = collapsed ? btn.dataset.more : btn.dataset.less;
      if (collapsed) box.scrollIntoView({block:'start'});
    });
  });
  // Arriving on a link to an embedded tool (lease.html#leasecheck, roommates.html#navigator) opens the whole tool.
  if (location.hash.length > 1){
    var box = document.getElementById(location.hash.slice(1));
    var b = box && box.classList.contains('embed') && box.querySelector('[data-expand]');
    if (b){ box.classList.remove('collapsed'); b.textContent = b.dataset.less; }
  }
  document.querySelectorAll('iframe[data-autofit]').forEach(function(f){
    function fit(){
      try {
        var d = f.contentDocument; if (!d || !d.documentElement) return;
        // Measure the content itself (not the frame), so the frame can shrink as well as grow.
        var b = d.body, cs = d.defaultView.getComputedStyle(b);
        var h = Math.ceil(b.getBoundingClientRect().height + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0));
        if (h < 200) h = d.documentElement.scrollHeight;
        if (h > 200) f.style.height = (h + 4) + 'px';
      } catch(_){}
    }
    f.addEventListener('load', function(){
      fit();
      try { if ('ResizeObserver' in window) new ResizeObserver(fit).observe(f.contentDocument.body); } catch(_){}
      setTimeout(fit, 800);
    });
  });
  // Keep the active tab visible in the scrolling nav on small screens.
  var cur = document.querySelector('.route a[aria-current="page"]');
  if (cur && cur.scrollIntoView){ try { cur.scrollIntoView({block:'nearest', inline:'center'}); } catch(_){} }
})();

/* ============ FURNITURE BOARD (prototype) ============
   Works two ways:
   - Shared mode: when the page runs as a Claude artifact with the `db` capability,
     listings live in the shared "furniture_listings" collection.
   - Prototype mode (anywhere else, e.g. GitHub Pages or opening the file): sample
     listings, and anything posted or reserved is kept in this browser only. */
(function(){
  var root = document.getElementById("furniture");
  if (!root) return;

  var CATS = [
    { id:"bed",     label:"Beds & mattresses" },
    { id:"desk",    label:"Desks & chairs" },
    { id:"seating", label:"Sofas & seating" },
    { id:"storage", label:"Storage" },
    { id:"kitchen", label:"Kitchen" },
    { id:"other",   label:"Lamps & other" }
  ];
  var AREAS = ["Cambridge – Harvard Sq", "Cambridge – Central / Kendall", "Cambridge – Porter / North",
               "Somerville", "Allston / Brighton", "Harvard University Housing", "Boston – other"];
  var MOVE_DAYS = [
    { id:"2027-08-21", label:"Sat, Aug 21", note:"Early arrivals, pre-orientation" },
    { id:"2027-08-28", label:"Sat, Aug 28", note:"Main arrival weekend" },
    { id:"2027-09-01", label:"Wed, Sep 1",  note:"Lease turnover day: expect traffic" }
  ];
  var HANDOFF = { here:"Seller still in town", friend:"A friend hands it over", storage:"Collected from storage", unit:"Stays in the apartment" };
  var ICONS = {
    bed: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6v30M60 22v14M4 28h56M4 22h56"/><rect x="8" y="14" width="14" height="8" rx="3"/></svg>',
    desk: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h40M8 14v24M40 14v24M28 14v12h12"/><path d="M50 22h10M52 22v-10h6v10M51 22v16M59 22v16"/></svg>',
    seating: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20v-10a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v10"/><path d="M4 22a4 4 0 0 1 8 0v4h40v-4a4 4 0 0 1 8 0v10H4z"/><path d="M8 32v5M56 32v5"/></svg>',
    storage: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="2" width="32" height="36" rx="2"/><path d="M16 14h32M16 26h32M30 8h4M30 20h4M30 32h4"/></svg>',
    kitchen: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14h32v16a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z"/><path d="M44 18h10M6 18h6M22 8c0-3 3-3 3-6M32 8c0-3 3-3 3-6"/></svg>',
    other: '<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4h16l6 14H18z"/><path d="M32 18v18M24 37h16"/></svg>'
  };

  /* Fictional sample listings for prototype mode only */
  var SAMPLES = [
    { id:"s1", title:"Queen bed frame + mattress", cat:"bed", price:180, cond:"Like new", w:63, d:84, h:14, area:"Cambridge – Central / Kendall",
      from:"2027-06-01", until:"2027-08-31", handoff:"friend", pay:["Cash at pickup","Pay after arrival"], bundle:true, stay:false, moveday:true,
      pickup:"2nd floor, wide staircase", note:"Mattress is 2 years old with a protector the whole time. Frame comes apart with an Allen key (included).",
      name:"Amara O.", program:"MPA/ID '27", verified:true, postedAt: 9 },
    { id:"s2", title:"Desk + ergonomic desk chair", cat:"desk", price:60, cond:"Good", w:47, d:24, h:30, area:"Allston / Brighton",
      from:"2027-05-28", until:"2027-08-25", handoff:"storage", pay:["Cash at pickup","Venmo / Zelle"], bundle:true, stay:false, moveday:true,
      pickup:"Picked up from a storage unit near Packard's Corner", note:"Chair has adjustable lumbar support. Small scratch on the desk's left corner.",
      name:"Daniel K.", program:"MPP '27", verified:true, postedAt: 8 },
    { id:"s3", title:"3-seat sofa, grey", cat:"seating", price:150, cond:"Good", w:84, d:35, h:33, area:"Somerville",
      from:"2027-06-10", until:"2027-08-31", handoff:"here", pay:["Cash at pickup"], bundle:false, stay:false, moveday:true,
      pickup:"3rd floor walk-up, no elevator. Measure your stairs!", note:"Comfortable, pet-free and smoke-free home. Cushion covers are machine washable.",
      name:"Lucía M.", program:"MC/MPA '27", verified:true, postedAt: 7 },
    { id:"s4", title:"5-shelf bookcase", cat:"storage", price:25, cond:"Good", w:31, d:11, h:71, area:"Cambridge – Harvard Sq",
      from:"2027-05-25", until:"2027-08-20", handoff:"friend", pay:["Cash at pickup","Venmo / Zelle"], bundle:false, stay:false, moveday:true,
      pickup:"Ground floor", note:"Sturdy, easy to carry with two people.",
      name:"Wei L.", program:"MPP '27", verified:true, postedAt: 6 },
    { id:"s5", title:"Kitchen starter kit for two", cat:"kitchen", price:0, cond:"Good", w:null, d:null, h:null, area:"Harvard University Housing",
      from:"2027-05-30", until:"2027-08-31", handoff:"friend", pay:["Cash at pickup"], bundle:true, stay:false, moveday:false,
      pickup:"Fits in one box", note:"Two pans, a pot, cutting board, knives, and plates, bowls and mugs for two. Free to a new student.",
      name:"Fatima R.", program:"MPA '27", verified:true, postedAt: 5 },
    { id:"s6", title:"6-drawer dresser", cat:"storage", price:70, cond:"Fair", w:55, d:19, h:31, area:"Cambridge – Porter / North",
      from:"2027-06-01", until:"2027-08-31", handoff:"here", pay:["Cash at pickup","Pay after arrival"], bundle:false, stay:false, moveday:true,
      pickup:"Elevator building", note:"One drawer handle is loose (tightens with a screwdriver).",
      name:"Jonas B.", program:"MPA '27", verified:true, postedAt: 4,
      reservation:{ name:"Incoming student", arrive:"2027-08-24", pickup:"2027-08-28", at: 1 } },
    { id:"s7", title:"Floor lamp + 5×8 rug", cat:"other", price:30, cond:"Like new", w:60, d:96, h:null, area:"Allston / Brighton",
      from:"2027-06-05", until:"2027-08-31", handoff:"here", pay:["Venmo / Zelle","Cash at pickup"], bundle:true, stay:false, moveday:true,
      pickup:"Rug is rolled and tied", note:"Warm-light floor lamp and a neutral rug, sold together.",
      name:"Priya S.", program:"MPP '27", verified:true, postedAt: 3 },
    { id:"s8", title:"Whole bedroom: bed, desk, dresser", cat:"bed", price:250, cond:"Good", w:null, d:null, h:null, area:"Cambridge – Central / Kendall",
      from:"2027-08-31", until:"2027-09-01", handoff:"unit", pay:["Pay after arrival","Cash at pickup"], bundle:true, stay:true, moveday:false,
      pickup:"Stays in the room: nothing to move", note:"If you're taking over my room on Sept 1, everything can stay. Full-size bed, desk, chair and dresser.",
      name:"Kofi A.", program:"MPA/ID '27", verified:true, postedAt: 2 }
  ];

  var LS_KEY = "hme-furniture-v1";
  var state = { mode:"local", listings:[], cat:"", tab:"browse" };
  var dbCol = null;

  /* ---------- helpers ---------- */
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function parseDay(s){ if (!s) return null; var p = String(s).split("-"); return p.length === 3 ? new Date(+p[0], +p[1]-1, +p[2]) : null; }
  function fmtDay(s){ var d = parseDay(s); return d ? d.toLocaleDateString("en-US", { month:"short", day:"numeric" }) : "—"; }
  function catLabel(id){ for (var i=0;i<CATS.length;i++) if (CATS[i].id === id) return CATS[i].label; return "Other"; }
  function isHarvard(email){ return /^[^\s@]+@([a-z0-9-]+\.)*harvard\.edu$/i.test(String(email||"").trim()); }
  function dayLabel(id){ for (var i=0;i<MOVE_DAYS.length;i++) if (MOVE_DAYS[i].id === id) return MOVE_DAYS[i].label; return null; }

  function loadLocal(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw){ var v = JSON.parse(raw); if (v && Array.isArray(v.listings)) return v.listings; }
    } catch(e){}
    return SAMPLES.map(function(x){ return JSON.parse(JSON.stringify(x)); });
  }
  function saveLocal(){
    try { localStorage.setItem(LS_KEY, JSON.stringify({ listings: state.listings })); return true; }
    catch(e){ return false; }
  }

  /* ---------- store: local or shared db ---------- */
  var store = {
    add: function(item){
      if (state.mode === "db") return dbCol.add(item);
      item.id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      state.listings.unshift(item);
      if (!saveLocal() && item.photo){ delete item.photo; saveLocal(); }
      render();
      return Promise.resolve();
    },
    reserve: function(id, reservation){
      if (state.mode === "db") return dbCol.doc(id).update({ reservation: reservation });
      state.listings.forEach(function(l){ if (l.id === id) l.reservation = reservation; });
      saveLocal(); render();
      return Promise.resolve();
    }
  };

  /* ---------- filters + render ---------- */
  function buildControls(){
    var areaSel = $("fb-area"), fsArea = $("fs-area"), fsCat = $("fs-cat");
    AREAS.forEach(function(a){
      areaSel.insertAdjacentHTML("beforeend", "<option>" + esc(a) + "</option>");
      fsArea.insertAdjacentHTML("beforeend", "<option>" + esc(a) + "</option>");
    });
    CATS.forEach(function(c){ fsCat.insertAdjacentHTML("beforeend", '<option value="' + c.id + '">' + esc(c.label) + "</option>"); });
    var chips = $("fb-cats");
    [{ id:"", label:"All" }].concat(CATS).forEach(function(c){
      var b = document.createElement("button");
      b.type = "button"; b.className = "fb-chip"; b.textContent = c.label;
      b.setAttribute("aria-pressed", c.id === state.cat ? "true" : "false");
      b.addEventListener("click", function(){
        state.cat = c.id;
        chips.querySelectorAll(".fb-chip").forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        render();
      });
      chips.appendChild(b);
    });
    ["fb-q","fb-area","fb-arrive","fb-sort","fb-only-avail","fb-only-bundle","fb-only-free"].forEach(function(id){
      $(id).addEventListener(id === "fb-q" ? "input" : "change", render);
    });
  }

  function filtered(){
    var q = $("fb-q").value.trim().toLowerCase();
    var area = $("fb-area").value, arrive = parseDay($("fb-arrive").value);
    var onlyAvail = $("fb-only-avail").checked, onlyBundle = $("fb-only-bundle").checked, onlyFree = $("fb-only-free").checked;
    var list = state.listings.filter(function(l){
      if (state.cat && l.cat !== state.cat) return false;
      if (area && l.area !== area) return false;
      if (onlyAvail && (l.reservation || l.held)) return false;
      if (onlyBundle && !l.bundle) return false;
      if (onlyFree && +l.price !== 0) return false;
      if (arrive){
        var f = parseDay(l.from), u = parseDay(l.until);
        if (u && arrive > u) return false;          // gone before you land
      }
      if (q){
        var hay = (l.title + " " + l.note + " " + catLabel(l.cat) + " " + l.area).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var sort = $("fb-sort").value;
    list.sort(function(a, b){
      if (sort === "price") return (+a.price) - (+b.price);
      if (sort === "soon") return String(a.from).localeCompare(String(b.from));
      return (+b.postedAt || 0) - (+a.postedAt || 0);
    });
    return list;
  }

  function dims(l){
    var parts = [l.w, l.d, l.h].filter(function(x){ return x; });
    if (!parts.length) return null;
    return (l.w || "?") + "″ W × " + (l.d || "?") + "″ D" + (l.h ? " × " + l.h + "″ H" : "");
  }

  function card(l){
    if (l.live) return liveCard(l);
    var free = +l.price === 0;
    var res = l.reservation;
    var photo = l.photo && /^data:image\//.test(l.photo)
      ? '<img alt="" src="' + esc(l.photo) + '">'
      : (ICONS[l.cat] || ICONS.other);
    var tags = '<span class="tag tag-ink">' + esc(l.cond || "Good") + "</span>";
    if (l.bundle) tags += '<span class="tag tag-good">Bundle</span>';
    if (l.stay) tags += '<span class="tag tag-amber">Can stay in unit</span>';
    if (l.moveday) tags += '<span class="tag tag-ink">Moving-day OK</span>';
    var d = dims(l);
    var facts =
      "<dt>Where</dt><dd>" + esc(l.area) + "</dd>" +
      "<dt>Available</dt><dd>" + fmtDay(l.from) + " – " + fmtDay(l.until) + "</dd>" +
      (d ? "<dt>Size</dt><dd>" + esc(d) + "</dd>" : "") +
      "<dt>Handoff</dt><dd>" + esc(HANDOFF[l.handoff] || HANDOFF.here) + "</dd>" +
      "<dt>Payment</dt><dd>" + esc((l.pay || []).join(" · ") || "Ask seller") + "</dd>" +
      (l.pickup ? "<dt>Pickup</dt><dd>" + esc(l.pickup) + "</dd>" : "");
    var actions;
    if (res){
      actions = '<span class="fb-reserved-note">Reserved until ' + fmtDay(res.arrive) +
        (dayLabel(res.pickup) ? " · moving day " + esc(dayLabel(res.pickup)) : "") + "</span>";
    } else {
      actions = '<button class="btn btn-primary" type="button" data-reserve="' + esc(l.id) + '">Reserve for my arrival</button>';
    }
    if (l.email){
      actions += '<a class="btn btn-ghost" href="mailto:' + encodeURIComponent(l.email) +
        "?subject=" + encodeURIComponent("HKS furniture board: " + l.title) + '">Email seller</a>';
    }
    var verified = (l.verified || isHarvard(l.email)) ? '<span class="fb-verified">✓ Harvard</span>' : "";
    return '<article class="fb-card' + (res ? " is-reserved" : "") + '">' +
      '<div class="fb-photo" data-cat="' + esc(l.cat) + '">' + photo +
        '<span class="fb-price' + (free ? " free" : "") + '">' + (free ? "Free" : "$" + esc(l.price)) + "</span>" +
        '<span class="fb-status">' + (res ? '<span class="tag tag-amber">Reserved</span>' : "") + "</span>" +
      "</div>" +
      '<div class="fb-body">' +
        "<h3>" + esc(l.title) + "</h3>" +
        '<div class="fb-tags">' + tags + "</div>" +
        '<dl class="fb-facts">' + facts + "</dl>" +
        (l.note ? '<p class="fb-note">' + esc(l.note) + "</p>" : "") +
        '<div class="fb-actions">' + actions + "</div>" +
        '<div class="fb-seller"><span>' + esc(l.name || "Someone") + (l.program ? " · " + esc(l.program) : "") + "</span>" + verified + "</div>" +
      "</div></article>";
  }

  /* ---------- live mode: listings from the team's Google Sheet ---------- */
  var CFG = window.HME_FURNITURE || {};
  var SIGNIN_KEY = "hme-harvard-email";
  function signedInEmail(){ try { return localStorage.getItem(SIGNIN_KEY) || sessionStorage.getItem(SIGNIN_KEY) || ""; } catch(e){ return ""; } }
  function requestUrl(id){
    var t = String(CFG.requestTemplate || ""), email = signedInEmail();
    if (!t) return "";
    var put = function(str, key, val){ val = encodeURIComponent(val); return str.split(encodeURIComponent(key)).join(val).split(key).join(val); };
    return put(put(t, "XLISTINGIDX", id), "xemailx@harvard.edu", email);
  }
  // Photo links from the sheet: Drive uploads become thumbnails; other https links are tried as images.
  function driveId(link){ var m = String(link).match(/(?:[?&]id=|\/d\/)([A-Za-z0-9_-]{20,})/); return m ? m[1] : ""; }
  function photoSrc(link){ var id = driveId(link); return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w800" : link; }
  function liveCard(l){
    var free = +l.price === 0;
    var photos = l.photoLinks || [];
    var img = photos.length
      ? '<a class="fb-photo-link" href="' + esc(photos[0]) + '" target="_blank" rel="noopener" aria-label="Open photo of ' + esc(l.title) + '">' +
          '<img class="fb-live-img" alt="Photo of ' + esc(l.title) + '" loading="lazy" referrerpolicy="no-referrer" src="' + esc(photoSrc(photos[0])) + '"></a>' +
        (photos.length > 1 ? '<span class="fb-photo-count">1 of ' + photos.length + "</span>" : "")
      : "";
    var held = l.status !== "Available";
    var tags = '<span class="tag tag-ink">' + esc(l.cond || "Good") + "</span>";
    if (l.bundle) tags += '<span class="tag tag-good">Bundle</span>';
    if (l.stay) tags += '<span class="tag tag-amber">Can stay in unit</span>';
    if (l.moveday) tags += '<span class="tag tag-ink">Moving-day OK</span>';
    var d = dims(l);
    var facts =
      "<dt>Where</dt><dd>" + esc(l.area) + "</dd>" +
      "<dt>Available</dt><dd>" + fmtDay(l.from) + " – " + fmtDay(l.until) + "</dd>" +
      (d ? "<dt>Size</dt><dd>" + esc(d) + "</dd>" : "") +
      (l.handoffText ? "<dt>Handoff</dt><dd>" + esc(l.handoffText) + "</dd>" : "") +
      "<dt>Payment</dt><dd>" + esc((l.pay || []).join(" · ") || "Ask seller") + "</dd>" +
      (l.pickup ? "<dt>Pickup</dt><dd>" + esc(l.pickup) + "</dd>" : "") +
      (photos.length ? "<dt>" + (photos.length > 1 ? "Photos" : "Photo") + "</dt><dd>" + photos.map(function(p, i){
        return '<a href="' + esc(p) + '" target="_blank" rel="noopener">' + (photos.length > 1 ? "Photo " + (i + 1) : "View full size") + " ↗</a>";
      }).join(" · ") + "</dd>" : "");
    var url = requestUrl(l.id);
    var actions = held
      ? '<span class="fb-reserved-note">' + (l.status === "Reserved" ? "Reserved by another student" : "On hold while the seller decides") + "</span>"
      : (url ? '<a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Request this item ↗</a>' : "");
    return '<article class="fb-card' + (held ? " is-reserved" : "") + '">' +
      '<div class="fb-photo" data-cat="' + esc(l.cat) + '">' + (ICONS[l.cat] || ICONS.other) + img +
        '<span class="fb-price' + (free ? " free" : "") + '">' + (free ? "Free" : "$" + esc(l.price)) + "</span>" +
        '<span class="fb-status">' + (held ? '<span class="tag tag-amber">' + (l.status === "Reserved" ? "Reserved" : "On hold") + "</span>" : "") + "</span>" +
      "</div>" +
      '<div class="fb-body">' +
        "<h3>" + esc(l.title) + "</h3>" +
        '<div class="fb-tags">' + tags + "</div>" +
        '<dl class="fb-facts">' + facts + "</dl>" +
        (l.note ? '<p class="fb-note">' + esc(l.note) + "</p>" : "") +
        '<div class="fb-actions">' + actions + "</div>" +
        '<div class="fb-seller"><span>Listing ' + esc(l.id) + '</span><span class="fb-verified">✓ Harvard seller</span></div>' +
      "</div></article>";
  }
  // CSV from Google Sheets "Publish to web" (handles quotes, commas and line breaks inside cells).
  function parseCSV(text){
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++){
      var ch = text[i];
      if (q){
        if (ch === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ","){ row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r"){
        if (ch === "\r" && text[i+1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell !== "" || row.length){ row.push(cell); rows.push(row); }
    return rows.filter(function(r){ return r.some(function(c){ return c !== ""; }); });
  }
  function isoDay(v){
    v = String(v || "").trim();
    var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);            // US sheet locale: month/day/year
    if (m) return m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    var d = new Date(v);
    return isNaN(d) ? "" : d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function catId(label){ for (var i = 0; i < CATS.length; i++) if (CATS[i].label === label) return CATS[i].id; return "other"; }
  function liveRows(text){
    var rows = parseCSV(text);
    if (rows.length < 1) return [];
    var h = rows[0].map(function(x){ return x.trim(); });
    var col = function(r, name){ var i = h.indexOf(name); return i < 0 ? "" : String(r[i] || "").trim(); };
    return rows.slice(1).map(function(r){
      var n = function(name){ var x = parseFloat(col(r, name).replace(/[^0-9.]/g, "")); return isNaN(x) ? null : x; };
      var handoff = col(r, "Handoff if seller has left");
      var photo = col(r, "Photo link");
      var posted = isoDay(col(r, "Posted"));
      return {
        live: true, id: col(r, "Listing ID"), title: col(r, "Item").replace(/^'/, ""), cat: catId(col(r, "Category")),
        price: n("Price ($)") || 0, cond: col(r, "Condition"), w: n("Width (in)"), d: n("Depth (in)"), h: n("Height (in)"),
        area: col(r, "Area"), from: isoDay(col(r, "Available from")), until: isoDay(col(r, "Pick up by")),
        handoffText: handoff, stay: /stays in the apartment/i.test(handoff),
        pay: col(r, "Payment accepted").split(/,\s*/).filter(String),
        bundle: col(r, "Bundle?") === "Yes", moveday: col(r, "Moving day OK?") === "Yes",
        pickup: col(r, "Pickup notes"), note: col(r, "Description").replace(/^'/, ""),
        photoLinks: photo.split(/\s+/).filter(function(p){ return /^https:\/\/\S+$/i.test(p); }).slice(0, 3), status: col(r, "Status") || "Available",
        held: (col(r, "Status") || "Available") !== "Available",
        postedAt: posted ? parseDay(posted).getTime() : 0
      };
    }).filter(function(l){ return l.id && l.title; });
  }
  function goLive(){
    state.mode = "live";
    $("fb-mode").classList.add("live");
    $("fb-mode-text").textContent = "Loading listings…";
    $("fb-reset").hidden = true;
    // Sell tab: the team's Google Form instead of the prototype form.
    $("fb-form").hidden = true;
    var sellBox = document.createElement("div");
    sellBox.className = "card fb-live-sell";
    sellBox.innerHTML = '<h3 style="margin-bottom:6px;">Post an item</h3>' +
      '<p style="margin:0 0 12px;">Fill in the form below with your Harvard email. You\'ll get an email with links to confirm a buyer or take the listing down.</p>' +
      (CFG.sellFormUrl ? '<a class="btn btn-primary" href="' + esc(CFG.sellFormUrl) + '" target="_blank" rel="noopener">Open the sell form ↗</a>' +
        '<iframe class="fb-form-embed" title="Sell an item" loading="lazy" src="' + esc(CFG.sellFormUrl + (CFG.sellFormUrl.indexOf("?") < 0 ? "?" : "&") + "embedded=true") + '"></iframe>' : "");
    $("fb-sell").appendChild(sellBox);
    var bust = (CFG.csvUrl.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now();
    fetch(CFG.csvUrl + bust).then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); }).then(function(text){
      state.listings = liveRows(text);
      $("fb-mode-text").textContent = "Live board: listings come from the team's Google Sheet. New posts can take a few minutes to appear.";
      render();
    }).catch(function(){
      state.mode = "local";
      $("fb-mode").classList.remove("live");
      $("fb-mode-text").textContent = "Couldn't load the live listings right now, so these are sample listings.";
      state.listings = loadLocal(); render();
    });
  }

  function render(){
    var list = filtered();
    var total = state.listings.length;
    $("fb-count").textContent = list.length + " of " + total + " listing" + (total === 1 ? "" : "s") +
      ($("fb-arrive").value ? " still available when you land" : "");
    var grid = $("fb-grid");
    if (!total){
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No listings yet. Leaving soon? Be the first to post something in "Sell something".</div>';
    } else if (!list.length){
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Nothing matches those filters. Try another area or category.</div>';
    } else {
      grid.innerHTML = list.map(card).join("");
    }
    renderMoveDays();
  }

  function renderMoveDays(){
    var wrap = $("fb-movedays");
    if (state.mode === "live"){
      wrap.innerHTML = MOVE_DAYS.map(function(day){
        return '<div class="fb-day"><b>' + esc(day.label) + "</b>" +
          '<p class="fb-note" style="margin-top:4px;">' + esc(day.note) + "</p>" +
          '<p class="fb-hint" style="margin:6px 0 0;">Choose this day on the request form.</p></div>';
      }).join("");
      return;
    }
    wrap.innerHTML = MOVE_DAYS.map(function(day){
      var items = state.listings.filter(function(l){ return l.reservation && l.reservation.pickup === day.id; });
      return '<div class="fb-day"><b>' + esc(day.label) + "</b>" +
        '<span class="mono">' + items.length + " item" + (items.length === 1 ? "" : "s") + " booked</span>" +
        '<p class="fb-note" style="margin-top:4px;">' + esc(day.note) + "</p>" +
        (items.length ? '<p class="fb-hint" style="margin:6px 0 0;">' + items.map(function(i){ return esc(i.title); }).join(" · ") + "</p>" : "") +
        "</div>";
    }).join("");
  }

  /* ---------- tabs ---------- */
  function showTab(t){
    state.tab = t;
    root.querySelectorAll("[data-fbtab]").forEach(function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-fbtab") === t ? "true" : "false"); });
    $("fb-browse").hidden = t !== "browse";
    $("fb-sell").hidden = t !== "sell";
    $("fb-move").hidden = t !== "move";
  }
  root.querySelectorAll("[data-fbtab]").forEach(function(b){
    b.addEventListener("click", function(){ showTab(b.getAttribute("data-fbtab")); });
  });

  /* ---------- sell form ---------- */
  var photoData = null;
  $("fs-photo").addEventListener("change", function(e){
    var f = e.target.files && e.target.files[0];
    photoData = null; $("fs-photo-prev").hidden = true;
    if (!f || !/^image\//.test(f.type)) return;
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function(){
      var max = 480, s = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      var q = 0.72, out = c.toDataURL("image/jpeg", q);
      while (out.length > 150000 && q > 0.3){ q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      photoData = out;
      $("fs-photo-prev").src = out; $("fs-photo-prev").hidden = false;
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  $("fb-form").addEventListener("submit", function(e){
    e.preventDefault();
    var err = $("fs-error"); err.textContent = "";
    var v = function(id){ return $(id).value.trim(); };
    var num = function(id){ var x = parseInt($(id).value, 10); return isFinite(x) && x > 0 ? x : null; };
    if (!v("fs-title") || v("fs-price") === "" || !v("fs-from") || !v("fs-until") || !v("fs-name") || !v("fs-email")){
      err.textContent = "Fill in the item, price, dates, your name and email."; return;
    }
    if (!isHarvard(v("fs-email"))){ err.textContent = "Use your Harvard email address (ending in harvard.edu)."; return; }
    if (parseDay(v("fs-until")) < parseDay(v("fs-from"))){ err.textContent = "The pick-up-by date must be after the available-from date."; return; }
    var big = ["bed","desk","seating","storage"].indexOf($("fs-cat").value) !== -1;
    if (big && !(num("fs-w") && num("fs-d"))){ err.textContent = "Add at least the width and depth so buyers can check it fits."; return; }
    var item = {
      title: v("fs-title").slice(0,70), cat: $("fs-cat").value,
      price: Math.max(0, Math.min(5000, parseInt($("fs-price").value, 10) || 0)),
      cond: $("fs-cond").value, w: num("fs-w"), d: num("fs-d"), h: num("fs-h"),
      area: $("fs-area").value, from: v("fs-from"), until: v("fs-until"), handoff: $("fs-handoff").value,
      pay: Array.prototype.map.call($("fs-pay").querySelectorAll("input:checked"), function(i){ return i.value; }),
      bundle: $("fs-bundle").checked, stay: $("fs-stay").checked, moveday: $("fs-moveday").checked,
      pickup: v("fs-pickup").slice(0,100), note: v("fs-note").slice(0,300),
      name: v("fs-name").slice(0,40), email: v("fs-email").slice(0,80),
      postedAt: Date.now()
    };
    if (photoData) item.photo = photoData;
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Posting…";
    store.add(item).then(function(){
      e.target.reset(); photoData = null; $("fs-photo-prev").hidden = true;
      $("fb-only-avail").checked = true; state.cat = "";
      $("fb-cats").querySelectorAll(".fb-chip").forEach(function(x, i){ x.setAttribute("aria-pressed", i === 0 ? "true" : "false"); });
      $("fb-sort").value = "new";
      showTab("browse"); render();
      root.scrollIntoView({ block:"start" });
    }).catch(function(){
      err.textContent = "Couldn't post right now. Please try again in a moment.";
    }).finally(function(){ btn.disabled = false; btn.textContent = "Post listing"; });
  });

  /* ---------- reserve dialog ---------- */
  var dlg = $("fb-dialog"), current = null;
  // A photo that can't load (private, deleted, or not an image) falls back to the category icon.
  $("fb-grid").addEventListener("error", function(e){
    var im = e.target;
    if (!im.classList || !im.classList.contains("fb-live-img")) return;
    var id = driveId(im.closest("a") ? im.closest("a").getAttribute("href") : "");
    if (id && !im.dataset.retry){ im.dataset.retry = "1"; im.src = "https://lh3.googleusercontent.com/d/" + id + "=w800"; return; }
    var a = im.closest(".fb-photo-link"); (a || im).remove();
  }, true);
  $("fb-grid").addEventListener("click", function(e){
    var b = e.target.closest("[data-reserve]");
    if (!b) return;
    var id = b.getAttribute("data-reserve");
    current = state.listings.filter(function(l){ return l.id === id; })[0];
    if (!current) return;
    $("fr-item").textContent = current.title + " · " + (+current.price === 0 ? "Free" : "$" + current.price) + " · " + current.area +
      " · available until " + fmtDay(current.until);
    var sel = $("fr-pickup");
    sel.innerHTML = '<option value="self">I\'ll pick it up myself</option>' +
      (current.moveday ? MOVE_DAYS.map(function(d){ return '<option value="' + d.id + '">Moving day · ' + esc(d.label) + "</option>"; }).join("") : "");
    $("fr-error").textContent = "";
    if ($("fb-arrive").value) $("fr-arrive").value = $("fb-arrive").value;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  });
  function closeDlg(){ if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
  $("fr-cancel").addEventListener("click", closeDlg);
  ["fb-form","fr-form"].forEach(function(id){
    $(id).addEventListener("input", function(){ $(id === "fb-form" ? "fs-error" : "fr-error").textContent = ""; });
  });
  $("fr-form").addEventListener("submit", function(e){
    e.preventDefault();
    var err = $("fr-error"); err.textContent = "";
    var name = $("fr-name").value.trim(), email = $("fr-email").value.trim(), arrive = $("fr-arrive").value;
    if (!name || !email || !arrive){ err.textContent = "Add your name, Harvard email and arrival date."; return; }
    if (!isHarvard(email)){ err.textContent = "Use your Harvard email address (ending in harvard.edu)."; return; }
    if (current && parseDay(arrive) > parseDay(current.until)){
      err.textContent = "The seller needs it collected by " + fmtDay(current.until) + ". Email them to ask if a friend or storage could hold it for you."; return;
    }
    var reservation = { name: name.slice(0,40), email: email.slice(0,80), arrive: arrive,
      pickup: $("fr-pickup").value, msg: $("fr-msg").value.trim().slice(0,240), at: Date.now() };
    var btn = $("fr-submit"); btn.disabled = true; btn.textContent = "Reserving…";
    store.reserve(current.id, reservation).then(function(){
      closeDlg(); $("fr-form").reset();
    }).catch(function(){
      err.textContent = "Couldn't reserve right now. Someone may have just reserved it; refresh and try again.";
    }).finally(function(){ btn.disabled = false; btn.textContent = "Reserve"; });
  });

  /* ---------- prototype reset ---------- */
  $("fb-reset").addEventListener("click", function(){
    try { localStorage.removeItem(LS_KEY); } catch(e){}
    state.listings = loadLocal(); render();
  });

  /* ---------- boot ---------- */
  buildControls();
  if (CFG.csvUrl){ state.listings = []; goLive(); render(); }
  else { state.listings = loadLocal(); render(); }

  // Upgrade to the shared board when the page runs with the `db` capability.
  if (window.claude && typeof window.claude.use === "function"){
    window.claude.use("db").then(function(db){
      if (!db || state.mode === "live") return;
      var col = db.collection("furniture_listings");
      col.orderBy("postedAt", "desc").limit(100).onSnapshot(function(snap){
        dbCol = col; state.mode = "db";
        state.listings = snap.docs.map(function(d){ var o = Object.assign({}, d.data()); o.id = d.id; return o; });
        var m = $("fb-mode"); m.classList.add("live");
        $("fb-mode-text").textContent = "Live board: listings and reservations are shared with everyone who can open this page.";
        $("fb-reset").hidden = true;
        render();
      }, function(){ /* stay in prototype mode */ });
    }).catch(function(){});
  }
})();

/* ===== Community (prototype by Eze Chukwu) ===== */
(function(){
  if (!document.getElementById("cGate")) return;
  // ---- simulated Harvard Key gate (prototype only: no real authentication) ----
  const SKEY = "hmez-key-demo";
  let signedIn = false;
  try { signedIn = sessionStorage.getItem(SKEY) === "1"; } catch(e) {}
  const gid = id => document.getElementById(id);
  function applyAuth(focusBar){
    gid("cGate").hidden = signedIn; gid("cMembers").hidden = !signedIn;
    if (signedIn && focusBar) gid("signedBar").focus();
  }
  const dlg = gid("keyDialog");
  const closeDlg = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
  gid("keySignIn").addEventListener("click", () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); });
  gid("keyCancel").addEventListener("click", closeDlg);
  gid("keyContinue").addEventListener("click", () => {
    signedIn = true; try { sessionStorage.setItem(SKEY, "1"); } catch(e) {}
    closeDlg(); applyAuth(true);
  });
  gid("keySignOut").addEventListener("click", () => {
    signedIn = false; try { sessionStorage.removeItem(SKEY); } catch(e) {}
    applyAuth(false); gid("keySignIn").focus();
  });
  applyAuth(false);
  // ---- community feed ----
  const PATHS = {
    general:["General question","t-general"], harvard:["Harvard housing","t-harvard"], sublet:["Sublets","t-sublet"],
    broker:["Broker or agent","t-broker"], safe:["Private landlord","t-safe"], roommate:["Roommates","t-roommate"],
    temp:["Temporary housing","t-temp"], unsafe:["Scams and unsafe landlords","t-unsafe"]
  };
  const TYPES = {question:"Question", tip:"Tip", story:"Story", scam:"Scam warning"};
  const EXAMPLES = [
    {id:"ex1", path:"harvard", type:"question", likes:6, text:"I land in late August. How early should I start looking at university housing, and what should I have ready first?",
     replies:[{name:"Example student", text:"Start before you travel and check the official housing pages for deadlines. I wish I had made a backup plan too."}]},
    {id:"ex2", path:"unsafe", type:"scam", likes:21, text:"A studio near campus was listed for about half the usual rent. The \"owner\" said they were overseas and would mail the keys after a gift card deposit. We walked away and reported the listing.",
     replies:[]},
    {id:"ex3", path:"broker", type:"question", likes:9, text:"A broker told us we owe a fee. How do we find out who actually hired them, and what should we ask for in writing?",
     replies:[{name:"Example student", text:"Ask directly who hired them and get the answer in writing before you pay anything."}]},
    {id:"ex4", path:"safe", type:"tip", likes:14, text:"Ask for a live video tour and have the landlord show you the unit and explain the lease while the camera is on. If they refuse, treat that as a red flag.", replies:[]},
    {id:"ex5", path:"roommate", type:"tip", likes:11, text:"Before signing a joint lease, write down who pays what and what happens if someone moves out. It is awkward to talk about, and much worse to skip.", replies:[]},
    {id:"ex6", path:"temp", type:"story", likes:8, text:"I booked a hotel for my first week through a platform with a clear refund policy. It gave me time to tour places in person instead of paying a stranger sight unseen.", replies:[]},
    {id:"ex7", path:"sublet", type:"question", likes:5, text:"The tenant says it is fine to sublet because the landlord \"won't mind.\" Is that enough?",
     replies:[{name:"Example student", text:"I would ask for written permission from the landlord before paying."}]},
    {id:"ex8", path:"general", type:"question", likes:12, text:"Does anyone know what documents a bank usually asks for if you do not have a Social Security number yet?", replies:[]}
  ];
  const KEY = "hmez-community-v1";
  let state = {mine:[], liked:{}, replies:{}};
  try { const raw = localStorage.getItem(KEY); if (raw) state = Object.assign(state, JSON.parse(raw)); } catch(e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} };

  let pathFilter = "all", typeFilter = "all";
  const $ = id => document.getElementById(id);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // personal-details check (prototype of simple moderation)
  function problem(text){
    if (!text.trim()) return "Please write something first.";
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return "Please remove the email address. Do not share contact details in public posts.";
    if (/(\+?\d[\d\s().-]{7,}\d)/.test(text)) return "That looks like a phone, ID or card number. Please remove it before posting.";
    return "";
  }
  function rel(ts){
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "just now"; if (m < 60) return m + " min ago";
    const h = Math.floor(m / 60); if (h < 24) return h + " hr ago";
    return new Date(ts).toLocaleDateString();
  }

  // chips + selects
  const chipBox = $("cPathChips");
  const addChip = (key, label) => {
    const b = mk("button", "chip" + (key !== "all" && key !== "general" ? " c-" + key : ""), label);
    b.type = "button"; b.dataset.key = key; b.setAttribute("aria-pressed", String(key === "all"));
    b.addEventListener("click", () => { pathFilter = key; chipBox.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === b))); render(); });
    chipBox.append(b);
  };
  addChip("all", "All");
  Object.entries(PATHS).forEach(([k, v]) => { addChip(k, v[0]); const o = mk("option", "", v[0]); o.value = k; $("cPath").append(o); });
  $("cTypeFilter").addEventListener("change", e => { typeFilter = e.target.value; render(); });

  function replyList(id, base){
    const list = (base || []).concat(state.replies[id] || []);
    const ul = mk("ul", "replies"); if (!list.length) ul.hidden = true;
    list.forEach(r => { const li = mk("li"); li.append(mk("span", "rwho", r.name || "Anonymous student"), mk("span", "", r.text)); ul.append(li); });
    return ul;
  }

  function postEl(p, mine){
    const art = mk("article", "post " + PATHS[p.path][1]);
    const head = mk("div", "post-head");
    head.append(mk("span", "ptag", PATHS[p.path][0]), mk("span", "ptype", TYPES[p.type]));
    const who = mk("span", "pwho");
    if (mine){ who.append(mk("span", "badge me", "You"), document.createTextNode(" " + (p.name || "Anonymous student") + ", " + rel(p.ts))); }
    else { who.append(mk("span", "badge ex", "Example")); }
    head.append(who);
    art.append(head, mk("p", "body", p.text));

    const actions = mk("div", "post-actions");
    const like = mk("button", "pbtn"); like.type = "button";
    const paint = () => { const on = !!state.liked[p.id]; like.setAttribute("aria-pressed", String(on)); like.textContent = "Helpful \u00b7 " + ((p.likes || 0) + (on ? 1 : 0)); };
    paint();
    like.addEventListener("click", () => { state.liked[p.id] = !state.liked[p.id]; if (!state.liked[p.id]) delete state.liked[p.id]; save(); paint(); });
    const rb = mk("button", "pbtn", "Reply"); rb.type = "button"; rb.setAttribute("aria-expanded", "false");
    actions.append(like, rb);
    if (mine){
      const del = mk("button", "pbtn", "Delete"); del.type = "button";
      del.addEventListener("click", () => { state.mine = state.mine.filter(x => x.id !== p.id); delete state.replies[p.id]; delete state.liked[p.id]; save(); render(); });
      actions.append(del);
    }
    art.append(actions);

    const ul = replyList(p.id, p.replies); art.append(ul);
    const form = mk("div", "reply-form"); form.hidden = true;
    const inp = mk("input"); inp.maxLength = 240; inp.placeholder = "Write a reply"; inp.setAttribute("aria-label", "Write a reply");
    const send = mk("button", "pbtn", "Send"); send.type = "button";
    const err = mk("p", "c-error"); err.hidden = true; err.setAttribute("role", "alert"); err.style.flexBasis = "100%"; err.style.margin = "0";
    send.addEventListener("click", () => {
      const msg = problem(inp.value);
      if (msg){ err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      (state.replies[p.id] = state.replies[p.id] || []).push({name:"You", text:inp.value.trim()});
      save(); inp.value = "";
      const fresh = replyList(p.id, p.replies); ul.replaceWith(fresh); art.replaceChild(fresh, art.querySelector(".replies"));
    });
    form.append(inp, send, err); art.append(form);
    rb.addEventListener("click", () => { form.hidden = !form.hidden; rb.setAttribute("aria-expanded", String(!form.hidden)); if (!form.hidden) inp.focus(); });
    return art;
  }

  function render(){
    const feed = $("cFeed"); feed.innerHTML = "";
    const all = state.mine.map(p => ({p, mine:true})).concat(EXAMPLES.map(p => ({p, mine:false})));
    const shown = all.filter(x => (pathFilter === "all" || x.p.path === pathFilter) && (typeFilter === "all" || x.p.type === typeFilter));
    shown.forEach(x => feed.append(postEl(x.p, x.mine)));
    if (!shown.length) feed.append(mk("p", "empty", "No posts here yet. Be the first to share something using the form."));
    $("cCount").textContent = "Showing " + shown.length + (shown.length === 1 ? " post" : " posts");
  }

  $("cText").addEventListener("input", e => { $("cLeft").textContent = (400 - e.target.value.length) + " characters left"; });
  $("cPost").addEventListener("click", () => {
    const text = $("cText").value, msg = problem(text), err = $("cError");
    if (msg){ err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    state.mine.unshift({id:"me" + Date.now(), path:$("cPath").value, type:$("cType").value, text:text.trim(), name:$("cName").value.trim(), ts:Date.now(), likes:0});
    save(); $("cText").value = ""; $("cLeft").textContent = "400 characters left";
    pathFilter = "all"; typeFilter = "all"; $("cTypeFilter").value = "all";
    chipBox.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.key === "all")));
    render();
  });
  $("cReset").addEventListener("click", () => { state = {mine:[], liked:{}, replies:{}}; save(); render(); });
  render();
})();
