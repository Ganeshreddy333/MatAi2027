/* ================================================================
   MatAi 2027 — registration form calculator (reference-format)
   Live pricing from a quantity-based fee table: participation
   (tiered), exhibition, sponsorship, special sponsorship, and
   add-ons. Builds the itemized Summary and keeps hidden fields
   (selectedItems, totalPrice, totalPriceEUR) in sync so the form
   submits cleanly through forms.js.
   ================================================================ */
(function () {
  "use strict";

  var form = document.querySelector('form[data-form="register"]');
  if (!form) return;

  // Active registration period. Early Bird is the current published rate;
  // Mid-Term / On-Spot are shown for reference and set by completion date.
  var ACTIVE = "eb";
  var PERIOD_TO_CODE = { "Early Bird": "eb", "Mid-Term": "mt", "On-Spot": "os" };
  var SERVICE_RATE = 0.05;
  var DISCOUNT_CODES = {};

  // Indicative display currencies. Registration is billed in EUR (base = 1).
  var CUR = {
    EUR: { sym: "€", rate: 1 },
    USD: { sym: "$", rate: 1.08 },
    GBP: { sym: "£", rate: 0.85 }
  };

  function id(x) { return document.getElementById(x); }
  function num(el) { var v = parseInt(el && el.value, 10); return (isNaN(v) || v < 0) ? 0 : v; }
  function curInfo() {
    var s = form.querySelector('select[name="currency"]');
    var c = s ? s.value : "EUR";
    return CUR[c] || CUR.EUR;
  }
  function fmt(eur, ci) {
    ci = ci || curInfo();
    var v = Math.round((eur || 0) * ci.rate * 100) / 100;
    var fractionDigits = Math.round(v) === v ? 0 : 2;
    return ci.sym + v.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2
    });
  }

  var rows = Array.prototype.slice.call(form.querySelectorAll("tr[data-item]"));
  var sumBody = id("sum-body");
  var sumTotal = id("sum-total");
  var totalInput = id("total-input");
  var totalEur = id("total-eur");
  var totalCur = id("total-cur");
  var selItems = id("selected-items");
  var participantCount = id("participant-count");
  var summaryRegistrationPrice = id("summary-registration-price");
  var summaryParticipants = id("summary-participants");
  var summaryDiscount = id("summary-discount");
  var summarySubtotal = id("summary-subtotal");
  var summaryService = id("summary-service");
  var couponCode = id("coupon-code");
  var couponApply = id("coupon-apply");
  var couponMsg = id("coupon-msg");
  var activeDiscount = 0;
  var activeCoupon = "";
  var captchaQuestion = id("captcha-question");
  var captchaAnswer = id("captcha-answer");
  var paymentGateway = id("payment-gateway");
  var paymentMethodHidden = id("payment-method-hidden");
  var captchaTotal = 0;

  function applyRegistrationPricing(pricing) {
    if (!pricing) return;
    var rate = Number(pricing.serviceRate);
    if (isFinite(rate) && rate >= 0 && rate <= 1) SERVICE_RATE = rate;
    var fixedItems = pricing.fixedItems || {};
    rows.forEach(function (tr) {
      var key = tr.getAttribute("data-price-key");
      if (!key || fixedItems[key] == null) return;
      var price = Number(fixedItems[key]);
      if (!isFinite(price) || price < 0) return;
      tr.setAttribute("data-price", String(price));
      var cell = tr.querySelector(".fp[data-base]");
      if (cell) cell.setAttribute("data-base", String(price));
    });
    recalc();
  }
  function applyCoupons(coupons) {
    DISCOUNT_CODES = {};
    (Array.isArray(coupons) ? coupons : []).forEach(function (coupon) {
      if (!coupon || coupon.enabled === false || !coupon.code) return;
      var percent = Number(coupon.percent);
      if (isFinite(percent) && percent > 0 && percent <= 100) {
        DISCOUNT_CODES[String(coupon.code).trim().toUpperCase()] = percent / 100;
      }
    });
    if (activeCoupon && !DISCOUNT_CODES[activeCoupon]) {
      activeCoupon = "";
      if (couponMsg) couponMsg.textContent = "Coupon not recognized. No discount applied.";
    }
    activeDiscount = DISCOUNT_CODES[activeCoupon] || 0;
    recalc();
  }

  function buildCaptcha() {
    if (!captchaQuestion || !captchaAnswer) return;
    var a = 2 + Math.floor(Math.random() * 8);
    var b = 1 + Math.floor(Math.random() * 9);
    captchaTotal = a + b;
    captchaQuestion.textContent = a + " + " + b + " =";
    captchaAnswer.value = "";
  }

  function rowUnitPrice(tr) {
    if (tr.hasAttribute("data-fixed")) return parseFloat(tr.getAttribute("data-price")) || 0;
    return parseFloat(tr.getAttribute("data-" + ACTIVE)) || 0;
  }

  function formatDeadline(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "To Be Announced";
    var parts = value.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  /* ---- Optional admin-managed participation fees ---- */
  function applyFees(fees) {
    if (!fees) return;
    var map = { Speaker: "Speaker", Delegate: "Delegate", Poster: "Poster", Student: "Student", Virtual: "Virtual" };
    var periodKey = { eb: "Early Bird", mt: "Mid-Term", os: "On-Spot" };
    rows.forEach(function (tr) {
      if (tr.hasAttribute("data-fixed")) return;
      var item = tr.getAttribute("data-item") || "";
      var cat = null;
      for (var k in map) { if (item.indexOf(k) === 0) { cat = k; break; } }
      if (!cat) return;
      ["eb", "mt", "os"].forEach(function (t) {
        var v = fees[periodKey[t]] && fees[periodKey[t]][cat];
        if (v == null) return;
        tr.setAttribute("data-" + t, v);
        var cell = tr.querySelectorAll(".fp")[["eb", "mt", "os"].indexOf(t)];
        if (cell) cell.setAttribute("data-base", v);
      });
    });
    recalc();
  }
  function applyRegistrationPeriods(periods) {
    if (!periods) return;
    ACTIVE = PERIOD_TO_CODE[periods.active] || ACTIVE;
    var periodInput = id("registration-period");
    if (periodInput) periodInput.value = periods.active || "Early Bird";
    var order = ["Early Bird", "Mid-Term", "On-Spot"];
    form.querySelectorAll(".fee-table th.tier-h").forEach(function (th, i) {
      var p = order[i], row = periods[p] || {};
      var label = row.label || p;
      var deadline = formatDeadline(row.deadline);
      th.textContent = label;
      var note = document.createElement("small");
      note.textContent = deadline;
      th.appendChild(note);
      th.classList.toggle("eb", PERIOD_TO_CODE[p] === ACTIVE);
    });
    form.querySelectorAll(".fee-table td.fp").forEach(function (td) { td.classList.remove("eb"); });
    var activeIndex = ["eb", "mt", "os"].indexOf(ACTIVE);
    rows.forEach(function (tr) {
      if (tr.hasAttribute("data-fixed")) return;
      var cells = tr.querySelectorAll(".fp");
      if (cells[activeIndex]) cells[activeIndex].classList.add("eb");
    });
    recalc();
  }
  if (window.MATAI_CONTENT) applyFees(window.MATAI_CONTENT.fees);
  if (window.MATAI_CONTENT) applyRegistrationPeriods(window.MATAI_CONTENT.registrationPeriods);
  if (window.MATAI_CONTENT) applyRegistrationPricing(window.MATAI_CONTENT.registrationPricing);
  if (window.MATAI_CONTENT) applyCoupons(window.MATAI_CONTENT.coupons);
  document.addEventListener("matai:content", function (e) {
    applyFees(e.detail && e.detail.fees);
    applyRegistrationPeriods(e.detail && e.detail.registrationPeriods);
    applyRegistrationPricing(e.detail && e.detail.registrationPricing);
    applyCoupons(e.detail && e.detail.coupons);
  });

  /* ---- Billing "same as above" ---- */
  var billingSame = id("billing-same");
  var billingGrid = id("billing-grid");
  function syncBilling() {
    if (!billingSame || !billingSame.checked) return;
    var g = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value : ""; };
    var s = function (n, v) { var el = form.querySelector('[name="' + n + '"]'); if (el) el.value = v; };
    s("billingName", g("fullName"));
    s("billingEmail", g("email"));
    s("billingCountry", g("country"));
  }
  if (billingSame) {
    billingSame.addEventListener("change", function () {
      if (billingGrid) billingGrid.classList.toggle("locked", billingSame.checked);
      syncBilling();
    });
  }

  function recalc() {
    var ci = curInfo();

    // Re-render every price cell in the selected currency.
    form.querySelectorAll(".fp[data-base]").forEach(function (cell) {
      var base = parseInt(cell.getAttribute("data-base"), 10);
      if (!isNaN(base)) cell.textContent = fmt(base, ci);
    });

    var grand = 0;
    var participants = 0;
    var items = [];
    rows.forEach(function (tr) {
      var qtyEl = tr.querySelector("input[data-qty]");
      var qty = num(qtyEl);
      var unit = rowUnitPrice(tr);
      var line = unit * qty;
      grand += line;
      if (!tr.hasAttribute("data-fixed")) {
        participants += qty;
      }
      var rtot = tr.querySelector("[data-line]");
      if (rtot) rtot.textContent = fmt(line, ci);
      tr.classList.toggle("chosen", qty > 0);
      if (qty > 0) items.push({ name: tr.getAttribute("data-item"), qty: qty, unit: unit, line: line });
    });

    var discount = Math.round(grand * activeDiscount * 100) / 100;
    var subtotal = Math.max(0, grand - discount);
    var service = Math.round(subtotal * SERVICE_RATE * 100) / 100;
    var finalTotal = subtotal + service;

    // Build the summary table.
    if (sumBody) {
      if (!items.length) {
        sumBody.innerHTML = '<tr class="sum-empty"><td colspan="4">No items selected yet — set a quantity above.</td></tr>';
      } else {
        sumBody.innerHTML = items.map(function (it) {
          var name = String(it.name || "").replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
          });
          return '<tr><td>' + name + '</td><td class="c">' + it.qty +
                 '</td><td class="r">' + fmt(it.unit, ci) + '</td><td class="r">' + fmt(it.line, ci) + '</td></tr>';
        }).join("");
      }
    }

    if (sumTotal) sumTotal.textContent = fmt(finalTotal, ci);
    if (totalCur) totalCur.textContent = ci.sym;
    if (totalInput) totalInput.value = (Math.round(finalTotal * ci.rate * 100) / 100).toFixed(2);
    if (totalEur) totalEur.value = finalTotal.toFixed(2);
    if (paymentGateway && paymentMethodHidden) paymentMethodHidden.value = paymentGateway.value;
    if (participantCount) participantCount.value = participants;
    if (summaryRegistrationPrice) summaryRegistrationPrice.textContent = fmt(grand, ci);
    if (summaryParticipants) summaryParticipants.textContent = participants;
    if (summaryDiscount) summaryDiscount.textContent = "-" + fmt(discount, ci);
    if (summarySubtotal) summarySubtotal.textContent = fmt(subtotal, ci);
    if (summaryService) summaryService.textContent = fmt(service, ci);

    // selectedItems is required — empty blocks submission via forms.js validate().
    if (selItems) {
      selItems.value = items.length
        ? items.map(function (it) { return it.name + " ×" + it.qty; }).join("; ")
        : "";
    }

    syncBilling();
  }

  // Recalculate on any change, and keep quantities non-negative integers.
  form.addEventListener("input", recalc);
  form.addEventListener("change", recalc);
  if (couponApply) {
    couponApply.addEventListener("click", function () {
      var code = (couponCode && couponCode.value ? couponCode.value : "").trim().toUpperCase();
      activeCoupon = code;
      activeDiscount = DISCOUNT_CODES[code] || 0;
      if (couponMsg) {
        couponMsg.textContent = activeDiscount
          ? "Coupon applied: " + Math.round(activeDiscount * 100) + "% discount."
          : (code ? "Coupon not recognized. No discount applied." : "Enter a conference coupon code if one has been provided.");
      }
      recalc();
    });
  }

  form.addEventListener("submit", function (e) {
    if (!captchaAnswer) return;
    if (parseInt(captchaAnswer.value, 10) !== captchaTotal) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var box = captchaAnswer.closest(".captcha-box");
      if (box) box.classList.add("invalid");
      buildCaptcha();
      return;
    }
    if (paymentGateway && paymentGateway.value === "Stripe / Card Payment") {
      e.preventDefault();
      e.stopImmediatePropagation();
      var status = form.querySelector(".form-status");
      var submitButton = form.querySelector('[type="submit"]');
      if (window.MATAI_STRIPE_ENABLED === false) {
        if (status) {
          status.className = "form-status err";
          status.textContent = "Stripe checkout is not configured. Please select Bank Transfer or contact the organizers.";
        }
        return;
      }
      var payload = {};
      new FormData(form).forEach(function (value, key) { payload[key] = value; });
      form.querySelectorAll('input[type="checkbox"][name]').forEach(function (checkbox) {
        payload[checkbox.name] = checkbox.checked;
      });
      var oldText = submitButton ? submitButton.textContent : "";
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Starting secure checkout…"; }
      fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().then(function (result) {
          if (!response.ok) throw new Error(result.error || "Could not start checkout.");
          return result;
        });
      }).then(function (result) {
        var checkoutUrl = new URL(result.url, location.href);
        if (checkoutUrl.origin !== "https://checkout.stripe.com") throw new Error("Stripe returned an invalid checkout URL.");
        location.assign(checkoutUrl.href);
      }).catch(function (error) {
        if (status) {
          status.className = "form-status err";
          status.textContent = error.message || "Could not start Stripe checkout. Please try again.";
        }
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = oldText; }
      });
    }
  }, true);
  if (captchaAnswer) {
    captchaAnswer.addEventListener("input", function () {
      var box = captchaAnswer.closest(".captcha-box");
      if (box) box.classList.remove("invalid");
    });
  }
  form.addEventListener("reset", function () {
    setTimeout(function () {
      if (billingGrid) billingGrid.classList.remove("locked");
      activeDiscount = 0;
      activeCoupon = "";
      if (couponMsg) couponMsg.textContent = "Enter a conference coupon code if one has been provided.";
      buildCaptcha();
      recalc();
    }, 0);
  });

  buildCaptcha();
  recalc();
})();
