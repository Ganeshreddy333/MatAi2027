// Terms & Conditions modal — opens when the user clicks the terms checkbox or link,
// shows the full T&C, and only ticks the box when the user presses "Accept".
(function () {
  var modal = document.getElementById("tc-modal");
  var check = document.getElementById("terms-check");
  if (!modal || !check) return;

  var openLink = document.getElementById("terms-open");
  var body = document.getElementById("tc-body");
  var btnAccept = document.getElementById("tc-accept");
  var btnDeny = document.getElementById("tc-deny");
  var btnClose = document.getElementById("tc-close");
  var lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (body) body.scrollTop = 0;
    if (btnAccept) btnAccept.focus();
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Clicking the checkbox never toggles directly — it always opens the modal first.
  check.addEventListener("click", function (e) {
    e.preventDefault();
    open();
  });
  // Keyboard activation (space/enter) on the checkbox also opens the modal.
  check.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      open();
    }
  });

  if (openLink) {
    openLink.addEventListener("click", function (e) {
      e.preventDefault();
      open();
    });
  }

  btnAccept.addEventListener("click", function () {
    check.checked = true;
    check.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  });

  btnDeny.addEventListener("click", function () {
    check.checked = false;
    check.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  });

  if (btnClose) btnClose.addEventListener("click", close);

  // Click on the backdrop (outside the dialog) closes without changing the choice.
  modal.addEventListener("click", function (e) {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });
})();
