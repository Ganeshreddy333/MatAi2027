(function () {
  "use strict";

  var CHALLENGE_MODELS = [
    { route: "M98 250 C205 250 238 290 315 258 S413 213 477 212 S560 169 703 127", art: "<path d='M0 0h188l86 86-34 44H86L0 78zM558 0h242v86l-98 45-58-48-86 30-58-58zM0 260l118-72 70 44-44 108H0zM526 340l82-96 76 40 116-42v98z' fill='url(#hv-block)'/>", instruction: "Slide the puzzle piece into the matching gap.", bg: ["#182b55", "#125a83", "#071a39"], blocks: ["#426ef5", "#153c9c"] },
    { route: "M96 270 C175 270 185 145 290 145 S405 265 490 248 S585 115 704 100", art: "<g fill='none' stroke='url(#hv-block)' stroke-width='12' opacity='.9'><path d='M25 48h130v62h85v-48h110M500 35h80v78h135M0 190h105v-42h90v100h94M480 315v-74h86v-43h145'/></g><g fill='#67e8f9'><circle cx='155' cy='48' r='9'/><circle cx='350' cy='62' r='9'/><circle cx='580' cy='35' r='9'/><circle cx='195' cy='148' r='9'/><circle cx='566' cy='198' r='9'/></g>", instruction: "Fit the piece into the matching circuit-shaped cutout.", bg: ["#152b4f", "#0b7778", "#07172e"], blocks: ["#20d3c2", "#087e9c"] },
    { route: "M96 105 C205 105 218 222 322 222 S425 118 520 132 S606 260 704 260", art: "<g fill='none' stroke='url(#hv-block)' opacity='.82'><circle cx='145' cy='126' r='68' stroke-width='18'/><circle cx='660' cy='74' r='95' stroke-width='26'/><circle cx='438' cy='310' r='86' stroke-width='22'/><path d='M0 45Q190 190 370 20T800 165' stroke-width='8'/><path d='M0 210Q245 40 450 280T800 200' stroke-width='6'/></g>", instruction: "Drag the piece sideways until it fits the open space.", bg: ["#31144f", "#8b2879", "#160d35"], blocks: ["#ff71ce", "#6b5cff"] },
    { route: "M96 275 C198 275 242 205 330 205 S412 102 505 112 S613 208 704 88", art: "<path d='M0 0 210 0 100 120 0 90ZM800 0 650 0 730 115 800 88ZM0 340 0 250 190 195 235 340ZM800 340 800 255 620 195 565 340Z' fill='url(#hv-block)'/><path d='m270 0 74 70-30 51-80-54zm270 340-75-71 45-57 86 54zM365 45l56 46-51 53-47-44zm75 205 64 34-39 51-63-42z' fill='#2dd4bf' opacity='.75'/>", instruction: "Match the puzzle piece to its cutout by sliding it across.", bg: ["#183b20", "#367c27", "#10261b"], blocks: ["#a3e635", "#16a34a"] },
    { route: "M96 225 C190 225 235 95 330 115 S415 280 520 248 S610 95 704 145", art: "<g fill='none' stroke='url(#hv-block)' stroke-width='3' opacity='.8'><path d='M0 40h800M0 90h800M0 140h800M0 190h800M0 240h800M0 290h800M80 0v340M160 0v340M240 0v340M320 0v340M400 0v340M480 0v340M560 0v340M640 0v340M720 0v340'/></g><g fill='#fb7185'><circle cx='160' cy='90' r='12'/><circle cx='320' cy='290' r='16'/><circle cx='560' cy='90' r='13'/><circle cx='720' cy='240' r='17'/></g>", instruction: "Slide the matching piece into the empty puzzle space.", bg: ["#3a1a25", "#8b2e38", "#1c1226"], blocks: ["#fb7185", "#c026d3"] },
    { route: "M96 160 C200 160 215 275 325 260 S425 90 525 100 S615 210 704 205", art: "<g fill='url(#hv-block)' opacity='.86'><path d='M30 270 110 80l85 190z'/><path d='M170 0h88v85h-88z'/><path d='M560 0 655 0 600 100z'/><path d='M670 245h100v95H670z'/><path d='M360 0h55v55h-55zM420 285h68v55h-68z'/></g><g fill='none' stroke='#fde68a' stroke-width='5' opacity='.8'><path d='M0 55 800 300M0 310 800 45'/></g>", instruction: "Line up the loose puzzle piece with the missing piece shape.", bg: ["#3e2c12", "#a05b18", "#21140b"], blocks: ["#facc15", "#f97316"] }
  ];
  var CHALLENGE_PALETTES = [
    { accent: "#29c9ef", piece: ["#14e2d1", "#04a9c2"], pieceStroke: "#35f5e7", route: "#f4fbff", targetFill: "#0e315a", innerFill: "#163d70" },
    { accent: "#41f0dc", piece: ["#a3e635", "#22c55e"], pieceStroke: "#d9ff72", route: "#e7fff9", targetFill: "#073d40", innerFill: "#0e5960" },
    { accent: "#ffa8f0", piece: ["#fb71ce", "#a855f7"], pieceStroke: "#ffd1f7", route: "#fff0fd", targetFill: "#4b1454", innerFill: "#741b72" },
    { accent: "#c4ff65", piece: ["#bef264", "#16a34a"], pieceStroke: "#eaffae", route: "#f4ffe2", targetFill: "#254714", innerFill: "#37641c" },
    { accent: "#ff8c9f", piece: ["#fb7185", "#e11d48"], pieceStroke: "#ffc3cf", route: "#fff0f3", targetFill: "#581526", innerFill: "#7f1d35" },
    { accent: "#ffe46b", piece: ["#fde047", "#f97316"], pieceStroke: "#fff3a6", route: "#fff9df", targetFill: "#573108", innerFill: "#754a0b" }
  ];
  var PUZZLE_SHAPES = [
    "M0 14 H28 C28 -2 52 -2 52 14 H76 V34 C92 34 92 58 76 58 V78 H52 C52 94 28 94 28 78 H0 Z",
    "M0 0 H76 V22 C92 22 92 46 76 46 V76 H48 C48 60 24 60 24 76 H0 Z",
    "M0 14 H24 C24 -2 48 -2 48 14 H76 V42 C60 42 60 66 76 66 V78 H0 Z",
    "M0 0 H76 V78 H52 C52 62 28 62 28 78 H0 V54 C16 54 16 30 0 30 Z",
    "M0 12 H28 C28 28 52 28 52 12 H76 V42 C60 42 60 66 76 66 V78 H0 Z",
    "M0 0 H76 V26 C60 26 60 50 76 50 V78 H46 C46 62 22 62 22 78 H0 Z",
    "M46 0 L57 29 L89 29 L64 48 L74 80 L46 61 L18 80 L28 48 L3 29 L35 29 Z",
    "M0 0 H92 V92 H0 Z",
    "M0 12 H92 V80 H0 Z",
    "M46 0 A46 46 0 1 1 45.9 0 Z",
    "M46 0 L92 92 H0 Z",
    "M23 0 H69 L92 46 L69 92 H23 L0 46 Z",
    "M46 0 L92 46 L46 92 L0 46 Z"
  ];
  var previousModel = -1;
  var previousShape = -1;

  var template = "<div class='human-checkbox-wrap'><button type='button' class='human-checkbox' role='checkbox' aria-checked='false' aria-expanded='false' aria-controls='human-verification-dialog'><span class='human-checkbox-mark' aria-hidden='true'>✓</span><span class='human-checkbox-label'>I'm not a robot</span><span class='human-checkbox-brand'><strong>Human check</strong><small>Privacy friendly</small></span></button><button type='button' class='human-retry' aria-label='Retry verification' title='Retry verification'>↻</button></div>" +
    "<div class='human-verification-modal' hidden><div class='human-verification-backdrop'></div><section id='human-verification-dialog' class='human-verification-card' role='dialog' aria-modal='true' aria-labelledby='human-verification-title'>" +
    "<button type='button' class='human-close' aria-label='Close verification'>×</button>" +
    "<h3 id='human-verification-title'>Quick human verification</h3>" +
    "<p class='human-verification-subtitle'>Slide the puzzle piece into the matching gap.</p>" +
    "<div class='human-verification-board' role='img' aria-label='A picture puzzle with a missing piece and a movable matching piece'>" +
      "<svg viewBox='0 0 800 340' aria-hidden='true' focusable='false'>" +
        "<defs><linearGradient id='hv-bg' x2='1' y2='1'><stop stop-color='#182b55'/><stop offset='.55' stop-color='#125a83'/><stop offset='1' stop-color='#071a39'/></linearGradient><linearGradient id='hv-block' x2='1' y2='1'><stop stop-color='#426ef5'/><stop offset='1' stop-color='#153c9c'/></linearGradient><linearGradient id='hv-teal' x2='1' y2='1'><stop stop-color='#14e2d1'/><stop offset='1' stop-color='#04a9c2'/></linearGradient><filter id='hv-glow'><feGaussianBlur stdDeviation='5' result='blur'/><feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter><clipPath id='hv-piece-clip' clipPathUnits='userSpaceOnUse'><path data-human-piece-clip d='M0 14 H28 C28 -2 52 -2 52 14 H76 V34 C92 34 92 58 76 58 V78 H52 C52 94 28 94 28 78 H0 Z'/></clipPath></defs>" +
        "<rect width='800' height='340' rx='24' fill='url(#hv-bg)'/>" +
        "<g data-human-art><path d='M0 0h188l86 86-34 44H86L0 78zM558 0h242v86l-98 45-58-48-86 30-58-58zM0 260l118-72 70 44-44 108H0zM526 340l82-96 76 40 116-42v98z' fill='url(#hv-block)'/></g>" +
        "<path data-human-slot d='M0 14 H28 C28 -2 52 -2 52 14 H76 V34 C92 34 92 58 76 58 V78 H52 C52 94 28 94 28 78 H0 Z' transform='translate(560 140)' fill='#06152d' fill-opacity='.72' stroke='#d9f7ff' stroke-width='3' stroke-dasharray='7 5'/>" +
        "<g data-human-piece transform='translate(28 140)'><g data-human-piece-art clip-path='url(#hv-piece-clip)'></g><path data-human-piece-outline d='M0 14 H28 C28 -2 52 -2 52 14 H76 V34 C92 34 92 58 76 58 V78 H52 C52 94 28 94 28 78 H0 Z' fill='url(#hv-teal)' fill-opacity='.2' stroke='#efffff' stroke-width='3' filter='url(#hv-glow)'/></g>" +
      "</svg>" +
    "</div>" +
    "<div class='human-verification-slider'><div class='human-slider-rail'><input type='range' min='0' max='100' step='1' value='0' aria-label='Slide the puzzle piece into the gap'><span class='human-slider-arrow' aria-hidden='true'>→</span></div></div>" +
    "<div class='human-verification-footer'><button type='button' class='human-refresh' aria-label='New challenge'>↻</button><span class='human-verification-status' aria-live='polite'>Slide the piece into the gap.</span><span class='human-privacy'><span aria-hidden='true'>✓</span> Privacy-friendly verification</span></div>" +
    "</section></div><input type='hidden' name='humanVerification' value='' required aria-label='Human verification'>";

  function init(widget) {
    widget.innerHTML = template;
    var form = widget.closest("form");
    var range = widget.querySelector("input[type='range']");
    var sliderRail = widget.querySelector(".human-slider-rail");
    var hidden = widget.querySelector("input[type='hidden']");
    var status = widget.querySelector(".human-verification-status");
    var art = widget.querySelector("[data-human-art]");
    var subtitle = widget.querySelector(".human-verification-subtitle");
    var backgroundStops = widget.querySelectorAll("#hv-bg stop");
    var blockStops = widget.querySelectorAll("#hv-block stop");
    var pieceStops = widget.querySelectorAll("#hv-teal stop");
    var slot = widget.querySelector("[data-human-slot]");
    var piece = widget.querySelector("[data-human-piece]");
    var pieceArt = widget.querySelector("[data-human-piece-art]");
    var pieceClip = widget.querySelector("[data-human-piece-clip]");
    var pieceOutline = widget.querySelector("[data-human-piece-outline]");
    var checkbox = widget.querySelector(".human-checkbox");
    var modal = widget.querySelector(".human-verification-modal");
    var answer = 0;
    var targetX = 0;
    var targetY = 0;
    var pieceStartX = 28;
    var pieceTravel = 640;

    function positionPiece(value) {
      sliderRail.style.setProperty("--human-slider-progress", value + "%");
      var x = pieceStartX + pieceTravel * value / 100;
      piece.setAttribute("transform", "translate(" + x + " " + targetY + ")");
    }
    function refresh() {
      var choices = CHALLENGE_MODELS.map(function (_model, index) { return index; }).filter(function (index) {
        return index !== previousModel;
      });
      var previousStored = -1;
      try {
        var storedModel = sessionStorage.getItem("matai-human-challenge-model");
        if (storedModel !== null) previousStored = parseInt(storedModel, 10);
      } catch (err) {}
      choices = choices.filter(function (index) { return index !== previousStored; });
      if (!choices.length) choices = CHALLENGE_MODELS.map(function (_model, index) { return index; });
      previousModel = choices[Math.floor(Math.random() * choices.length)];
      try { sessionStorage.setItem("matai-human-challenge-model", String(previousModel)); } catch (err) {}
      var model = CHALLENGE_MODELS[previousModel];
      var palette = CHALLENGE_PALETTES[previousModel];
      widget.dataset.model = String(previousModel);
      widget.style.setProperty("--human-accent", palette.accent);
      widget.style.setProperty("--human-tint", palette.accent + "20");
      art.innerHTML = model.art;
      subtitle.textContent = model.instruction;
      backgroundStops[0].setAttribute("stop-color", model.bg[0]);
      backgroundStops[1].setAttribute("stop-color", model.bg[1]);
      backgroundStops[2].setAttribute("stop-color", model.bg[2]);
      blockStops[0].setAttribute("stop-color", model.blocks[0]);
      blockStops[1].setAttribute("stop-color", model.blocks[1]);
      pieceStops[0].setAttribute("stop-color", palette.piece[0]);
      pieceStops[1].setAttribute("stop-color", palette.piece[1]);
      pieceOutline.setAttribute("stroke", palette.pieceStroke);
      var previousStoredShape = -1;
      try {
        var storedShape = sessionStorage.getItem("matai-human-challenge-shape");
        if (storedShape !== null) previousStoredShape = parseInt(storedShape, 10);
      } catch (err) {}
      var shapeChoices = PUZZLE_SHAPES.map(function (_shape, index) { return index; }).filter(function (index) { return index !== previousShape && index !== previousStoredShape; });
      if (!shapeChoices.length) shapeChoices = PUZZLE_SHAPES.map(function (_shape, index) { return index; });
      previousShape = shapeChoices[Math.floor(Math.random() * shapeChoices.length)];
      try { sessionStorage.setItem("matai-human-challenge-shape", String(previousShape)); } catch (err) {}
      widget.dataset.shape = String(previousShape);
      var shape = PUZZLE_SHAPES[previousShape];
      slot.setAttribute("d", shape);
      pieceClip.setAttribute("d", shape);
      pieceOutline.setAttribute("d", shape);
      answer = 40 + Math.floor(Math.random() * 53);
      targetX = pieceStartX + pieceTravel * answer / 100;
      targetY = 58 + Math.floor(Math.random() * 185);
      slot.setAttribute("transform", "translate(" + targetX + " " + targetY + ")");
      pieceArt.setAttribute("transform", "translate(" + -targetX + " " + -targetY + ")");
      pieceArt.innerHTML = "<rect width='800' height='340' fill='url(#hv-bg)'/><g>" + model.art + "</g>";
      range.value = "0";
      positionPiece(0);
      hidden.value = "";
      widget.dataset.verified = "false";
      checkbox.setAttribute("aria-checked", "false");
      checkbox.disabled = false;
      widget.classList.remove("verified", "invalid");
      status.textContent = "Slide the piece into the gap.";
    }
    function move() {
      var value = Number(range.value);
      positionPiece(value);
      if (Math.abs(value - answer) <= 1) {
        hidden.value = "verified";
        widget.dataset.verified = "true";
        widget.classList.remove("invalid");
        widget.classList.add("verified");
        checkbox.setAttribute("aria-checked", "true");
        checkbox.setAttribute("aria-expanded", "false");
        checkbox.disabled = true;
        modal.hidden = true;
        status.textContent = "Verification complete.";
      } else {
        hidden.value = "";
        widget.dataset.verified = "false";
        widget.classList.remove("verified");
        status.textContent = "Slide the piece into the gap.";
      }
    }

    widget.querySelector(".human-refresh").addEventListener("click", refresh);
    checkbox.addEventListener("click", function () {
      if (widget.dataset.verified === "true") return;
      refresh();
      modal.hidden = false;
      checkbox.setAttribute("aria-expanded", "true");
      range.focus();
    });
    widget.querySelector(".human-retry").addEventListener("click", function () {
      refresh();
      modal.hidden = false;
      checkbox.setAttribute("aria-expanded", "true");
      range.focus();
    });
    widget.querySelector(".human-close").addEventListener("click", function () {
      modal.hidden = true;
      checkbox.setAttribute("aria-expanded", "false");
      checkbox.focus();
    });
    widget.querySelector(".human-verification-backdrop").addEventListener("click", function () {
      modal.hidden = true;
      checkbox.setAttribute("aria-expanded", "false");
    });
    widget.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        modal.hidden = true;
        checkbox.setAttribute("aria-expanded", "false");
        checkbox.focus();
      }
    });
    range.addEventListener("input", move);
    if (form) form.addEventListener("reset", function () { window.setTimeout(function () { refresh(); modal.hidden = true; checkbox.setAttribute("aria-expanded", "false"); }, 0); });
    refresh();
  }

  document.querySelectorAll("[data-human-verification]").forEach(init);
  window.MATAIHumanVerification = {
    isVerified: function (form) {
      var widget = form && form.querySelector("[data-human-verification]");
      return !!widget && widget.dataset.verified === "true";
    }
  };
})();
