/* ================================================================
   MatAi 2027 — Admin console logic
   ================================================================ */
(function () {
  "use strict";

  var PAY = ["Pending", "Paid", "Refunded", "Cancelled", "Failed"];
  var STATUS = ["New", "Reviewed", "Approved", "Rejected", "Completed"];
  var KIND_LABEL = { all: "All Submissions", register: "Registrations", abstract: "Abstracts", contact: "Contacts", brochure: "Brochure Requests" };
  var current = "content";
  var cache = {};      // kind -> items
  var contentData = null;
  var currentEditPage = "index.html";
  var PAGE_FILES = [
    { href: "index.html", label: "Home Page" },
    { href: "about.html", label: "About the Conference" },
    { href: "committee.html", label: "Scientific Committee" },
    { href: "speakers.html", label: "Speakers" },
    { href: "abstract-submission.html", label: "Abstract Submission" },
    { href: "sessions.html", label: "Scientific Sessions" },
    { href: "venue.html", label: "Venue" },
    { href: "information.html", label: "Information" },
    { href: "sponsors.html", label: "Sponsors & Exhibition" },
    { href: "registration.html", label: "Registration" },
    { href: "contact.html", label: "Contact" },
    { href: "brochure.html", label: "Brochure" }
  ];
  var FIXED_PRICE_ITEMS = [
    ["exhibition_standard", "Standard Exhibition Booth — 3 × 2 m"],
    ["exhibition_premium", "Premium Exhibition Booth — 3 × 3 m"],
    ["exhibition_startup", "Start-Up Pavilion"],
    ["sponsor_diamond", "Diamond Sponsor"],
    ["sponsor_platinum", "Platinum Sponsor"],
    ["sponsor_gold", "Gold Sponsor"],
    ["sponsor_silver", "Silver Sponsor"],
    ["sponsor_bronze", "Bronze / Supporting Sponsor"],
    ["sponsor_keynote", "Keynote Session Sponsor"],
    ["sponsor_plenary", "Plenary Session Sponsor"],
    ["sponsor_advertising", "Advertising Sponsor"],
    ["sponsor_coffee", "Coffee Break Sponsor"],
    ["sponsor_lunch", "Lunch Sponsor (per day)"],
    ["sponsor_reception", "Conference Reception Sponsor"],
    ["sponsor_kit", "Conference Kit Sponsor"],
    ["sponsor_lanyard", "Lanyard & Badge Sponsor"],
    ["sponsor_awards", "Awards & Young Researcher Sponsor"],
    ["sponsor_insert", "Delegate Kit Insert"],
    ["sponsor_industry", "Industry Presentation"],
    ["addon_social", "Social & Networking Event (per ticket)"],
    ["addon_accompanying", "Accompanying Person"],
    ["addon_accommodation_single", "Accommodation — Single Occupancy (per night)"],
    ["addon_accommodation_double", "Accommodation — Double Occupancy (per night)"]
  ];

  function $(s, r) { return (r || document).querySelector(s); }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function d(r, k) { return (r.data && r.data[k] != null) ? r.data[k] : ""; }
  function fmt(iso) { if (!iso) return ""; var dt = new Date(iso); return isNaN(dt) ? "" : dt.toLocaleString(); }

  function api(url, opts) {
    return fetch(url, opts || {}).then(function (r) {
      if (r.status === 401) { showLogin(); throw new Error("unauth"); }
      var ct = r.headers.get("content-type") || "";
      return (ct.indexOf("json") > -1 ? r.json() : r.text()).then(function (body) {
        if (!r.ok) throw new Error(body && body.error ? body.error : "Request failed (" + r.status + ")");
        return body;
      });
    });
  }
  function toast(msg, err) {
    var t = el("toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
    setTimeout(function () { t.className = "toast"; }, 2600);
  }
  function notifySiteContentChanged() {
    if ("BroadcastChannel" in window) {
      var channel = new BroadcastChannel("matai-site-content");
      channel.postMessage({ type: "content-updated" });
      channel.close();
      return;
    }
    try {
      localStorage.setItem("matai-content-updated", String(Date.now()));
    } catch (err) {
      console.error("Could not notify open website tabs about saved content:", err);
    }
  }

  /* ---------- Load dashboard ---------- */
  function loadAll() {
    api("/admin/api/stats").then(function (j) { if (j && j.ok) renderStats(j.stats); })
      .catch(function (err) { if (err.message !== "unauth") toast("Could not load dashboard statistics", true); });
    if (current === "content") loadContent();
    else loadKind(current);
  }

  function renderStats(s) {
    var c = s.counts || {};
    var cards = [
      { b: c.register || 0, l: "Registrations", a: false },
      { b: "€" + (s.revenue || 0).toLocaleString("en-US"), l: "Revenue (Paid)", a: true },
      { b: s.pending || 0, l: "Payments Pending", a: false },
      { b: c.abstract || 0, l: "Abstracts", a: false },
      { b: (c.contact || 0) + " / " + (c.brochure || 0), l: "Contact / Brochure", a: false }
    ];
    el("stats").innerHTML = cards.map(function (x) {
      return '<div class="a-stat' + (x.a ? " accent" : "") + '"><b>' + x.b + "</b><span>" + x.l + "</span></div>";
    }).join("");
  }

  /* ---------- Tabs ---------- */
  document.querySelector(".a-nav-tabs").addEventListener("click", function (e) {
    var t = e.target.closest(".a-tab"); if (!t) return;
    var view = t.getAttribute("data-view");
    document.querySelectorAll(".a-tab").forEach(function (b) { b.classList.toggle("active", b === t); });
    var isSubmissions = view === "submissions";
    document.getElementById("content-view").style.display = isSubmissions ? "none" : "block";
    document.getElementById("sub-view").style.display = isSubmissions ? "block" : "none";
    document.querySelector(".a-header-actions").style.display = isSubmissions ? "none" : "flex";
    el("stats").style.display = view === "data" ? "grid" : "none";
    if (isSubmissions) {
      current = el("submission-kind").value || "all";
      el("sub-title").textContent = KIND_LABEL[current] || current;
      loadKind(current);
      return;
    }
    current = "content";
    el("main-title").textContent = view === "content" ? "Website Content" : t.textContent.trim();
    var targets = {
      content: "media-editor",
      speakers: "speaker-editor",
      media: "media-editor",
      data: "stats",
      information: "conference-information",
      settings: "registration-settings",
      coupons: "coupon-settings",
      accommodation: "accommodation-prices"
    };
    var target = el(targets[view] || "media-editor");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el("export-btn").addEventListener("click", function () {
    if (current !== "content") window.open("/admin/api/export/" + encodeURIComponent(current), "_blank");
  });
  el("submission-kind").addEventListener("change", function () {
    current = el("submission-kind").value || "all";
    el("sub-title").textContent = KIND_LABEL[current] || current;
    loadKind(current);
  });

  /* ---------- Submissions table ---------- */
  var COLS = {
    register: [
      { h: "Ref", f: function (r) { return '<span class="a-ref">' + esc(r.reference) + "</span>"; } },
      { h: "Name", f: function (r) { return esc(d(r, "fullName")); } },
      { h: "Email", f: function (r) { return esc(d(r, "email")); } },
      { h: "Category", f: function (r) { return esc(d(r, "category")) + '<div class="a-sub">' + esc(d(r, "period")) + "</div>"; } },
      { h: "Amount", f: function (r) { return "€" + (r.amount || 0); } },
      { h: "Payment", f: function (r) { return paySelect(r); } },
      { h: "Received", f: function (r) { return '<span class="a-sub">' + fmt(r.receivedAt) + "</span>"; } }
    ],
    abstract: [
      { h: "Ref", f: function (r) { return '<span class="a-ref">' + esc(r.reference) + "</span>"; } },
      { h: "Title", f: function (r) { return esc(d(r, "title")); } },
      { h: "Author", f: function (r) { return esc(d(r, "authorName")); } },
      { h: "Email", f: function (r) { return esc(d(r, "email")); } },
      { h: "Status", f: function (r) { return statusPill(r); } },
      { h: "Received", f: function (r) { return '<span class="a-sub">' + fmt(r.receivedAt) + "</span>"; } }
    ],
    contact: [
      { h: "Ref", f: function (r) { return '<span class="a-ref">' + esc(r.reference) + "</span>"; } },
      { h: "Name", f: function (r) { return esc(d(r, "fullName")); } },
      { h: "Email", f: function (r) { return esc(d(r, "email")); } },
      { h: "Subject", f: function (r) { return esc(d(r, "subject")); } },
      { h: "Received", f: function (r) { return '<span class="a-sub">' + fmt(r.receivedAt) + "</span>"; } }
    ],
    brochure: [
      { h: "Ref", f: function (r) { return '<span class="a-ref">' + esc(r.reference) + "</span>"; } },
      { h: "Name", f: function (r) { return esc(d(r, "fullName")); } },
      { h: "Email", f: function (r) { return esc(d(r, "email")); } },
      { h: "Organization", f: function (r) { return esc(d(r, "organization")); } },
      { h: "Received", f: function (r) { return '<span class="a-sub">' + fmt(r.receivedAt) + "</span>"; } }
    ]
  };

  function paySelect(r) {
    var v = r.paymentStatus || "Pending";
    return '<select class="a-select" data-kind="' + esc(r.kind || current) + '" data-pay="' + esc(r.reference) + '">' + PAY.map(function (o) {
      return '<option' + (o === v ? " selected" : "") + ">" + o + "</option>";
    }).join("") + "</select>";
  }
  function statusPill(r) {
    var v = r.status || "New";
    return '<span class="pill-status st-' + esc(v) + '">' + esc(v) + "</span>";
  }

  function loadKind(kind) {
    el("sub-title").textContent = KIND_LABEL[kind] || kind;
    var endpoint = kind === "all" ? "/admin/api/submissions" : "/admin/api/submissions/" + encodeURIComponent(kind);
    api(endpoint).then(function (j) {
      if (!j || !j.ok) return;
      if (kind === "all") {
        cache.all = j.items || [];
        ["register", "abstract", "contact", "brochure"].forEach(function (recordKind) {
          cache[recordKind] = cache.all.filter(function (item) { return item.kind === recordKind; });
        });
      } else {
        cache[kind] = j.items || [];
      }
      renderTable(kind, cache[kind] || []);
    }).catch(function (err) {
      if (err.message !== "unauth") toast("Could not load " + (KIND_LABEL[kind] || kind).toLowerCase(), true);
    });
  }

  function renderTable(kind, items) {
    var cols = kind === "all" ? [
      { h: "Form", f: function (r) { return esc(KIND_LABEL[r.kind] || r.kind); } },
      { h: "Reference", f: function (r) { return '<span class="a-ref">' + esc(r.reference) + "</span>"; } },
      { h: "Name / Title", f: function (r) { return esc(d(r, "fullName") || d(r, "authorName") || d(r, "title")); } },
      { h: "Email", f: function (r) { return esc(d(r, "email")); } },
      { h: "Status", f: function (r) { return r.kind === "register" ? paySelect(r) : statusPill(r); } },
      { h: "Amount", f: function (r) { return r.kind === "register" ? "€" + Number(r.amount || 0).toFixed(2) : "—"; } },
      { h: "Received", f: function (r) { return '<span class="a-sub">' + fmt(r.receivedAt) + "</span>"; } }
    ] : COLS[kind];
    if (!cols) return;
    el("thead").innerHTML = "<tr>" + cols.map(function (c) { return "<th>" + c.h + "</th>"; }).join("") + "</tr>";
    el("empty").style.display = items.length ? "none" : "block";
    el("tbody").innerHTML = items.map(function (r) {
      return '<tr data-ref="' + esc(r.reference) + '" data-kind="' + esc(r.kind || kind) + '">' +
        cols.map(function (c) { return "<td>" + c.f(r) + "</td>"; }).join("") + "</tr>";
    }).join("");
  }

  // Delegated events on table body
  el("tbody").addEventListener("change", function (e) {
    var sel = e.target.closest("[data-pay]"); if (!sel) return;
    var ref = sel.getAttribute("data-pay");
    var kind = sel.getAttribute("data-kind") || current;
    api("/admin/api/submissions/" + encodeURIComponent(kind) + "/" + encodeURIComponent(ref), {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: sel.value })
    }).then(function (j) {
      if (j && j.ok) { toast("Payment status updated"); loadAll(); }
    }).catch(function () { toast("Update failed", true); });
  });
  el("tbody").addEventListener("click", function (e) {
    if (e.target.closest("select") || e.target.closest("button")) return;
    var tr = e.target.closest("tr[data-ref]"); if (!tr) return;
    openDrawer(tr.getAttribute("data-kind") || current, tr.getAttribute("data-ref"));
  });

  /* ---------- Detail drawer ---------- */
  var drawerRef = null, drawerKind = null;

  function openDrawer(kind, ref) {
    var items = cache[kind] || [];
    var rec = items.filter(function (x) { return x.reference === ref; })[0];
    if (!rec) return;
    drawerRef = ref; drawerKind = kind;
    el("d-title").textContent = (KIND_LABEL[kind] || kind).replace(/s$/, "") + " · " + ref;

    var data = rec.data || {};
    var ctrls = "<h4>Submission details</h4><p class='a-muted'>Edit submitted form data. Changes are stored in the backend.</p>";
    Object.keys(data).forEach(function (key) {
      var value = data[key];
      var label = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
      if (typeof value === "boolean") {
        ctrls += field(label, "<label class='switch'><input type='checkbox' data-submission-field='" + esc(key) +
          "'" + (value ? " checked" : "") + "> Yes</label>");
      } else if (typeof value === "number") {
        ctrls += field(label, "<input class='a-input' type='number' step='any' data-submission-field='" + esc(key) +
          "' value='" + esc(value) + "'>");
      } else if (/abstract|message|address|items/i.test(key) || String(value).length > 160) {
        ctrls += field(label, "<textarea class='a-input' data-submission-field='" + esc(key) + "'>" + esc(value) + "</textarea>");
      } else {
        var inputType = /email/i.test(key) ? "email" : "text";
        ctrls += field(label, "<input class='a-input' type='" + inputType + "' data-submission-field='" + esc(key) +
          "' value='" + esc(value) + "'>");
      }
    });
    if (rec.attachment && kind === "abstract") {
      var attachmentUrl = "/admin/api/submissions/" + encodeURIComponent(kind) + "/" +
        encodeURIComponent(ref) + "/attachment";
      ctrls += field("Uploaded document", "<a class='a-btn sm' href='" + attachmentUrl +
        "' target='_blank' rel='noopener'>" + esc(rec.attachment.originalName || "Download document") + " · Download</a>" +
        "<div class='a-sub'>" + (Number(rec.attachment.size) / (1024 * 1024)).toFixed(2) + " MB</div>");
    }
    ctrls += field("Received", "<div class='a-readonly'>" + esc(fmt(rec.receivedAt)) + "</div>");
    if (rec.ip) ctrls += field("IP address", "<div class='a-readonly'>" + esc(rec.ip) + "</div>");
    if (kind === "register") {
      ctrls += field("Payment status", selectHtml("d-pay", PAY, rec.paymentStatus || "Pending"));
      ctrls += field("Payment amount (€)", "<input class='a-input' id='d-amount' type='number' min='0' step='0.01' value='" + esc(rec.amount || 0) + "'>");
    }
    ctrls += field("Review status", selectHtml("d-status", STATUS, rec.status || "New"));
    ctrls += field("Admin notes", "<textarea class='a-input' id='d-notes'>" + esc(rec.adminNotes || "") + "</textarea>");
    ctrls += "<div style='display:flex;gap:.6rem;margin-top:1rem'>" +
      "<button class='a-btn' id='d-save'>Save</button>" +
      "<button class='a-btn danger' id='d-del'>Delete</button></div>";

    el("d-body").innerHTML = ctrls;
    el("drawer").classList.add("open");
    el("drawer-bg").classList.add("open");
    el("d-save").addEventListener("click", saveDrawer);
    el("d-del").addEventListener("click", deleteDrawer);
  }

  function field(label, inner) { return "<div class='a-field'><label>" + label + "</label>" + inner + "</div>"; }
  function selectHtml(id, opts, val) {
    return "<select class='a-select' id='" + id + "' data-kind='" + esc(drawerKind) + "'>" + opts.map(function (o) {
      return "<option" + (o === val ? " selected" : "") + ">" + o + "</option>";
    }).join("") + "</select>";
  }

  function closeDrawer() {
    el("drawer").classList.remove("open");
    el("drawer-bg").classList.remove("open");
    drawerRef = null; drawerKind = null;
  }
  el("d-close").addEventListener("click", closeDrawer);
  el("drawer-bg").addEventListener("click", closeDrawer);

  function saveDrawer() {
    if (!drawerRef) return;
    var data = {};
    document.querySelectorAll("#d-body [data-submission-field]").forEach(function (input) {
      var key = input.getAttribute("data-submission-field");
      if (input.type === "checkbox") data[key] = input.checked;
      else if (input.type === "number") data[key] = input.value === "" ? "" : Number(input.value);
      else data[key] = input.value;
    });
    var body = { data: data, adminNotes: el("d-notes").value, status: el("d-status").value };
    if (drawerKind === "register") {
      body.paymentStatus = el("d-pay").value;
      body.amount = el("d-amount").value;
    }
    api("/admin/api/submissions/" + encodeURIComponent(drawerKind) + "/" + encodeURIComponent(drawerRef), {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (j) {
      if (j && j.ok) { toast("Saved"); closeDrawer(); loadAll(); }
      else toast("Save failed", true);
    }).catch(function () { toast("Save failed", true); });
  }

  function deleteDrawer() {
    if (!drawerRef) return;
    if (!confirm("Delete this record permanently?")) return;
    api("/admin/api/submissions/" + encodeURIComponent(drawerKind) + "/" + encodeURIComponent(drawerRef), { method: "DELETE" })
      .then(function (j) {
        if (j && j.ok) { toast("Deleted"); closeDrawer(); loadAll(); }
        else toast("Delete failed", true);
      }).catch(function () { toast("Delete failed", true); });
  }

  /* ---------- Site content editor ---------- */
  var FEE_PERIODS = ["Early Bird", "Mid-Term", "On-Spot"];
  var FEE_CATS = ["Speaker", "Delegate", "Poster", "Student", "Virtual"];

  function loadContent() {
    api("/api/content").then(function (j) {
      contentData = (j && j.content) ? j.content : (j || {});
      fillContent(contentData);
    }).catch(function (err) {
      if (err.message !== "unauth") toast("Could not load website settings", true);
    });
  }

  function fillContent(c) {
    c = c || {};
    var b = c.banner || {}, s = c.site || {};
    el("c-banner-on").checked = !!b.enabled;
    el("c-banner-text").value = b.text || "";
    el("c-theme").value = s.theme || "";
    el("c-dates").value = s.dateText || "";
    el("c-city").value = s.city || "";
    renderDates(c.dates || []);
    renderFees(c.fees || {});
    renderPeriods(c.registrationPeriods || {});
    renderFixedPrices(c.registrationPricing || {});
    renderCoupons(c.coupons || []);
    renderPagePicker();
    loadPageEditor(currentEditPage);
    renderMembers(c.committee || []);
    renderSpeakers(c.speakers || []);
  }

  function renderDates(dates) {
    el("dates-list").innerHTML = dates.map(function (dt, i) {
      return "<div class='a-row' data-date='" + i + "'>" +
        "<input class='a-input' data-df='label' value='" + esc(dt.label) + "' placeholder='Label'>" +
        "<input class='a-input' data-df='value' value='" + esc(dt.value) + "' placeholder='Value'>" +
        "<button class='a-btn ghost sm' data-rmdate='" + i + "'>Remove</button></div>";
    }).join("");
  }

  el("dates-list").addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rmdate]"); if (!rm) return;
    rm.closest("[data-date]").remove();
  });
  el("add-date").addEventListener("click", function () {
    var box = document.createElement("div");
    box.className = "a-row"; box.setAttribute("data-date", "new");
    box.innerHTML = "<input class='a-input' data-df='label' placeholder='Label'>" +
      "<input class='a-input' data-df='value' placeholder='Value'>" +
      "<button class='a-btn ghost sm' data-rmdate='x'>Remove</button>";
    el("dates-list").appendChild(box);
  });

  function renderFees(fees) {
    var head = "<tr><th>Period</th>" + FEE_CATS.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr>";
    var rows = FEE_PERIODS.map(function (p) {
      var row = fees[p] || {};
      return "<tr><td>" + p + "</td>" + FEE_CATS.map(function (c) {
        return "<td><input type='number' data-fee='" + esc(p) + "|" + c + "' value='" + esc(row[c] != null ? row[c] : 0) + "'></td>";
      }).join("") + "</tr>";
    }).join("");
    el("fees-table").innerHTML = head + rows;
  }

  function renderPeriods(periods) {
    var active = periods.active || "Early Bird";
    el("reg-active").innerHTML = FEE_PERIODS.map(function (p) {
      return "<option" + (p === active ? " selected" : "") + ">" + p + "</option>";
    }).join("");
    el("periods-list").innerHTML = FEE_PERIODS.map(function (p) {
      var row = periods[p] || {};
      var deadline = /^\d{4}-\d{2}-\d{2}$/.test(row.deadline || "") ? row.deadline : "";
      return "<div class='a-period' data-period='" + esc(p) + "'>" +
        "<div class='a-row'><label style='width:90px;color:var(--a-muted);font-size:.8rem'>" + esc(p) + "</label>" +
        "<input class='a-input' data-pf='label' value='" + esc(row.label || p) + "' placeholder='Display label'>" +
        "<label class='a-date-field'>Deadline<input class='a-input' data-pf='deadline' type='date' value='" + deadline + "'></label></div></div>";
    }).join("");
  }

  function renderFixedPrices(pricing) {
    var prices = pricing.fixedItems || {};
    var rows = FIXED_PRICE_ITEMS.map(function (item) {
      var value = prices[item[0]];
      return "<tr><td>" + esc(item[1]) + "</td><td><label class='a-price-input'><span>€</span>" +
        "<input type='number' min='0' step='0.01' data-fixed-price='" + esc(item[0]) +
        "' value='" + esc(value != null ? value : 0) + "' aria-label='" + esc(item[1]) + " price'></label></td></tr>";
    }).join("");
    el("item-prices").innerHTML = "<thead><tr><th>Registration item</th><th>Price (EUR)</th></tr></thead><tbody>" + rows + "</tbody>";
    var serviceRate = Number(pricing.serviceRate);
    el("service-rate").value = isFinite(serviceRate) ? String(serviceRate * 100) : "5";
  }

  function renderCoupons(coupons) {
    el("coupons-list").innerHTML = (Array.isArray(coupons) ? coupons : []).map(function (coupon, i) {
      coupon = coupon || {};
      return "<div class='a-row a-coupon' data-coupon='" + i + "'>" +
        "<label class='switch'><input type='checkbox' data-cf='enabled'" + (coupon.enabled === false ? "" : " checked") + "> Enabled</label>" +
        "<input class='a-input' data-cf='code' value='" + esc(coupon.code || "") + "' placeholder='Coupon code' aria-label='Coupon code'>" +
        "<label class='a-percent'><input class='a-input' data-cf='percent' type='number' min='1' max='100' step='1' value='" +
        esc(coupon.percent != null ? coupon.percent : 10) + "' aria-label='Discount percentage'> % off</label>" +
        "<button class='a-btn ghost sm' data-remove-coupon type='button'>Remove</button></div>";
    }).join("") || "<p class='a-empty'>No coupons configured.</p>";
  }

  el("coupons-list").addEventListener("click", function (e) {
    var remove = e.target.closest("[data-remove-coupon]");
    if (remove) remove.closest("[data-coupon]").remove();
  });
  el("add-coupon").addEventListener("click", function () {
    var coupons = readCoupons();
    coupons.push({ code: "", percent: 10, enabled: true });
    renderCoupons(coupons);
  });
  function readCoupons() {
    return Array.prototype.map.call(document.querySelectorAll("#coupons-list [data-coupon]"), function (row) {
      var field = function (name) { return row.querySelector("[data-cf='" + name + "']"); };
      return {
        code: field("code").value.trim().toUpperCase(),
        percent: Number(field("percent").value) || 0,
        enabled: field("enabled").checked
      };
    }).filter(function (coupon) { return coupon.code; });
  }

  function renderPagePicker() {
    var sel = el("page-select");
    if (!sel || sel.options.length) return;
    sel.innerHTML = PAGE_FILES.map(function (p) {
      return "<option value='" + esc(p.href) + "'>" + esc(p.label) + "</option>";
    }).join("");
    sel.value = currentEditPage;
  }

  function loadPageEditor(page) {
    currentEditPage = page || currentEditPage;
    var sel = el("page-select");
    if (sel) sel.value = currentEditPage;
    var box = el("page-sections-editor");
    if (!box) return;
    box.innerHTML = "<p class='a-sub'>Loading page sections...</p>";
    fetch(currentEditPage)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var sections = Array.prototype.slice.call(doc.querySelectorAll("body > section")).filter(function (section) {
          return !section.classList.contains("page-section-picker") && !section.classList.contains("abstract-section-picker");
        });
        var saved = ((contentData && contentData.pages && contentData.pages[currentEditPage]) || {});
        if (!sections.length) {
          box.innerHTML = "<p class='a-empty'>No editable content sections found on this page.</p>";
          return;
        }
        var sectionHtml = sections.map(function (section, i) {
          var key = "sec-" + i;
          var titleEl = section.querySelector("h2,h3,.eyebrow,p.lead");
          var title = titleEl ? titleEl.textContent.trim() : ("Section " + (i + 1));
          var currentHtml = saved[key] && saved[key].html != null ? saved[key].html : section.innerHTML.trim();
          return "<div class='a-page-section' data-sec='" + key + "'>" +
            "<div class='a-row section-title'><strong>" + esc(title || ("Section " + (i + 1))) + "</strong>" +
            "<div class='a-action-buttons'><button class='a-btn ghost sm' data-reset-section='" + key + "' type='button'>Use Original</button>" +
            "<button class='a-btn sm' data-save-section type='button'>Save Section</button></div></div>" +
            "<textarea class='a-input page-html' rows='10' data-original='" + esc(section.innerHTML.trim()) + "'>" + esc(currentHtml) + "</textarea>" +
          "</div>";
        }).join("");
        var addedKeys = Object.keys(saved).filter(function (key) {
          var index = Number(key.replace(/^sec-/, ""));
          return /^sec-\d+$/.test(key) && index >= sections.length;
        }).sort(function (a, b) {
          return Number(a.slice(4)) - Number(b.slice(4));
        });
        sectionHtml += addedKeys.map(function (key) {
          return addedSectionEditor(key, saved[key] && saved[key].html || "");
        }).join("");
        box.innerHTML = sectionHtml;
      })
      .catch(function () {
        box.innerHTML = "<p class='a-empty'>Could not load this page for editing.</p>";
      });
  }

  el("load-page-sections").addEventListener("click", function () {
    loadPageEditor(el("page-select").value);
  });
  el("page-select").addEventListener("change", function () {
    loadPageEditor(el("page-select").value);
  });
  el("page-sections-editor").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-reset-section]");
    if (btn) {
      var wrap = btn.closest("[data-sec]");
      var ta = wrap && wrap.querySelector("textarea");
      if (ta) ta.value = ta.getAttribute("data-original") || "";
      return;
    }
    if (e.target.closest("[data-save-section]")) saveContent();
    var remove = e.target.closest("[data-remove-section]");
    if (remove) remove.closest("[data-sec]").remove();
  });

  function addedSectionEditor(key, html) {
    return "<div class='a-page-section' data-sec='" + esc(key) + "'>" +
      "<div class='a-row section-title'><strong>Added Section</strong>" +
      "<div class='a-action-buttons'><button class='a-btn ghost sm' data-remove-section type='button'>Remove Section</button>" +
      "<button class='a-btn sm' data-save-section type='button'>Save Section</button></div></div>" +
      "<textarea class='a-input page-html' rows='10' data-original=''>" + esc(html) + "</textarea>" +
      "</div>";
  }

  el("add-section").addEventListener("click", function () {
    var box = el("page-sections-editor");
    if (!box) return;
    var maxIndex = -1;
    box.querySelectorAll("[data-sec]").forEach(function (section) {
      var index = Number(section.getAttribute("data-sec").slice(4));
      if (isFinite(index)) maxIndex = Math.max(maxIndex, index);
    });
    box.insertAdjacentHTML("beforeend", addedSectionEditor("sec-" + (maxIndex + 1), ""));
    box.lastElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  el("init-defaults").addEventListener("click", function () {
    if (!currentEditPage || !window.confirm("Restore this page to its original content? Saved edits for this page will be removed.")) return;
    var payload = Object.assign({}, contentData || {});
    payload.pages = Object.assign({}, payload.pages || {});
    delete payload.pages[currentEditPage];
    api("/admin/api/content", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: payload })
    }).then(function (result) {
      if (!result || !result.ok) throw new Error("Could not restore the default page content");
      contentData = result.content || payload;
      loadPageEditor(currentEditPage);
      notifySiteContentChanged();
      toast("Page restored to original content");
    }).catch(function (err) {
      if (err.message !== "unauth") toast(err.message || "Could not restore defaults", true);
    });
  });

  /* ---------- Committee members editor ---------- */
  var COMMITTEE_GROUPS = ["Scientific Committee", "International Advisory Committee"];

  function memberRow(m) {
    m = m || {};
    var opts = COMMITTEE_GROUPS.map(function (g) {
      return "<option value='" + esc(g) + "'" + (m.group === g ? " selected" : "") + ">" + esc(g) + "</option>";
    }).join("");
    var box = document.createElement("div");
    box.className = "a-member"; box.setAttribute("data-member", "1");
    box.innerHTML =
      "<div class='a-row'>" +
        "<select class='a-input' data-mf='group' style='max-width:240px'>" + opts + "</select>" +
        "<input class='a-input' data-mf='name' value='" + esc(m.name || "") + "' placeholder='Full name (e.g. Prof. Jane Doe)'>" +
        "<button class='a-btn ghost sm' data-rmmember='1'>Remove</button>" +
      "</div>" +
      "<div class='a-row'>" +
        "<input class='a-input' data-mf='role' value='" + esc(m.role || "") + "' placeholder='Role / Department / Research area'>" +
        "<input class='a-input' data-mf='org' value='" + esc(m.org || "") + "' placeholder='Institution — Country'>" +
      "</div>" +
      "<div class='a-row'>" +
        "<input class='a-input' data-mf='photo' value='" + esc(m.photo || "") + "' placeholder='Photo URL (optional, e.g. images/member1.jpg)'>" +
      "</div>" +
      "<div class='a-row'>" +
        "<textarea class='a-input' data-mf='bio' rows='2' placeholder='Short biography (optional)'>" + esc(m.bio || "") + "</textarea>" +
      "</div>";
    return box;
  }

  function renderMembers(members) {
    var list = el("members-list");
    list.innerHTML = "";
    (members || []).forEach(function (m) { list.appendChild(memberRow(m)); });
  }

  el("members-list").addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rmmember]"); if (!rm) return;
    rm.closest("[data-member]").remove();
  });
  el("add-member").addEventListener("click", function () {
    el("members-list").appendChild(memberRow({ group: COMMITTEE_GROUPS[0] }));
  });

  /* ---------- Speakers editor ---------- */
  var SPEAKER_GROUPS = ["Keynote Speakers", "Plenary Speakers", "Featured / Invited Speakers"];

  function speakerRow(m) {
    m = m || {};
    var opts = SPEAKER_GROUPS.map(function (g) {
      return "<option value='" + esc(g) + "'" + (m.group === g ? " selected" : "") + ">" + esc(g) + "</option>";
    }).join("");
    var box = document.createElement("div");
    box.className = "a-member"; box.setAttribute("data-speaker", "1");
    box.innerHTML =
      "<div class='a-row'>" +
        "<select class='a-input' data-sf='group' style='max-width:240px'>" + opts + "</select>" +
        "<input class='a-input' data-sf='name' value='" + esc(m.name || "") + "' placeholder='Speaker name (e.g. Prof. Jane Doe)'>" +
        "<button class='a-btn ghost sm' data-rmspeaker='1'>Remove</button>" +
      "</div>" +
      "<div class='a-row'>" +
        "<input class='a-input' data-sf='role' value='" + esc(m.role || "") + "' placeholder='Title / Position / Research area'>" +
        "<input class='a-input' data-sf='org' value='" + esc(m.org || "") + "' placeholder='Institution / Organization — Country'>" +
      "</div>" +
      "<div class='a-row'>" +
        "<input class='a-input' data-sf='photo' value='" + esc(m.photo || "") + "' placeholder='Photo URL (optional, e.g. images/speaker1.jpg)'>" +
      "</div>" +
      "<div class='a-row'>" +
        "<input class='a-input' data-sf='topic' value='" + esc(m.topic || "") + "' placeholder='Presentation / focus (optional)'>" +
      "</div>" +
      "<div class='a-row'>" +
        "<textarea class='a-input' data-sf='bio' rows='2' placeholder='Short biography (optional)'>" + esc(m.bio || "") + "</textarea>" +
      "</div>";
    return box;
  }

  function renderSpeakers(speakers) {
    var list = el("speakers-list");
    list.innerHTML = "";
    (speakers || []).forEach(function (m) { list.appendChild(speakerRow(m)); });
  }

  el("speakers-list").addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rmspeaker]"); if (!rm) return;
    rm.closest("[data-speaker]").remove();
  });
  el("add-speaker").addEventListener("click", function () {
    el("speakers-list").appendChild(speakerRow({ group: SPEAKER_GROUPS[0] }));
  });

  function saveContent() {
    var dates = [];
    document.querySelectorAll("#dates-list [data-date]").forEach(function (row) {
      var l = $("[data-df='label']", row).value.trim();
      var v = $("[data-df='value']", row).value.trim();
      if (l || v) dates.push({ label: l, value: v });
    });
    var fees = {};
    FEE_PERIODS.forEach(function (p) { fees[p] = {}; });
    document.querySelectorAll("#fees-table [data-fee]").forEach(function (inp) {
      var parts = inp.getAttribute("data-fee").split("|");
      fees[parts[0]][parts[1]] = Number(inp.value) || 0;
    });
    var registrationPeriods = { active: el("reg-active").value || "Early Bird" };
    document.querySelectorAll("#periods-list [data-period]").forEach(function (row) {
      var p = row.getAttribute("data-period");
      var label = $("[data-pf='label']", row).value.trim();
      var deadline = $("[data-pf='deadline']", row).value.trim();
      registrationPeriods[p] = { label: label || p, deadline: deadline || "To Be Announced" };
    });
    var fixedItems = {};
    document.querySelectorAll("#item-prices [data-fixed-price]").forEach(function (inp) {
      fixedItems[inp.getAttribute("data-fixed-price")] = Math.max(0, Number(inp.value) || 0);
    });
    var pages = Object.assign({}, (contentData && contentData.pages) || {});
    if (currentEditPage) {
      pages[currentEditPage] = {};
      document.querySelectorAll("#page-sections-editor [data-sec]").forEach(function (row) {
        var key = row.getAttribute("data-sec");
        var html = row.querySelector("textarea").value;
        pages[currentEditPage][key] = { html: html };
      });
    }
    var committee = [];
    document.querySelectorAll("#members-list [data-member]").forEach(function (row) {
      var mf = function (f) { var e = $("[data-mf='" + f + "']", row); return e ? e.value.trim() : ""; };
      var name = mf("name");
      if (!name) return; // skip empty rows
      committee.push({
        group: mf("group") || COMMITTEE_GROUPS[0],
        name: name, role: mf("role"), org: mf("org"),
        photo: mf("photo"), bio: mf("bio")
      });
    });
    var speakers = [];
    document.querySelectorAll("#speakers-list [data-speaker]").forEach(function (row) {
      var sf = function (f) { var e = $("[data-sf='" + f + "']", row); return e ? e.value.trim() : ""; };
      var name = sf("name");
      if (!name) return; // skip empty rows
      speakers.push({
        group: sf("group") || SPEAKER_GROUPS[0],
        name: name, role: sf("role"), org: sf("org"),
        photo: sf("photo"), topic: sf("topic"), bio: sf("bio")
      });
    });
    var payload = {
      banner: { enabled: el("c-banner-on").checked, text: el("c-banner-text").value.trim() },
      site: { theme: el("c-theme").value.trim(), dateText: el("c-dates").value.trim(), city: el("c-city").value.trim() },
      dates: dates, fees: fees, registrationPeriods: registrationPeriods,
      registrationPricing: {
        serviceRate: Math.min(100, Math.max(0, Number(el("service-rate").value) || 0)) / 100,
        fixedItems: fixedItems
      },
      coupons: readCoupons(), pages: pages, committee: committee, speakers: speakers
    };
    api("/admin/api/content", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: payload })
    }).then(function (j) {
      if (j && j.ok) {
        contentData = j.content || payload;
        notifySiteContentChanged();
        toast("Content saved — live site updated");
      }
      else toast("Save failed", true);
    }).catch(function () { toast("Save failed", true); });
  }
  document.querySelectorAll("#save-content, [data-save-content]").forEach(function (button) {
    button.addEventListener("click", saveContent);
  });
  el("refresh-btn").addEventListener("click", loadAll);
  document.querySelector("[data-refresh-submissions]").addEventListener("click", loadAll);

  /* ---------- Boot ---------- */
  function showLogin() { el("login-view").style.display = "grid"; el("shell").style.display = "none"; }
  function showShell() { el("login-view").style.display = "none"; el("shell").style.display = "block"; loadAll(); }

  el("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var username = el("user").value;
    var pw = el("pw").value;
    fetch("/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username, password: pw }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) { el("pw").value = ""; el("login-msg").textContent = ""; showShell(); }
        else { el("login-msg").textContent = j.error || "Login failed."; }
      })
      .catch(function () { el("login-msg").textContent = "Could not reach the server."; });
  });

  el("logout-btn").addEventListener("click", function () {
    fetch("/admin/logout", { method: "POST" }).then(function () { showLogin(); });
  });
  fetch("/admin/api/session").then(function (r) { return r.json(); })
    .then(function (j) { if (j.authed) showShell(); else showLogin(); })
    .catch(showLogin);
})();
