document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".nav-group-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var group = btn.parentElement;
      document.querySelectorAll(".nav-group.open").forEach(function (g) {
        if (g !== group) g.classList.remove("open");
      });
      group.classList.toggle("open");
      btn.setAttribute("aria-expanded", group.classList.contains("open") ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-group")) {
      document.querySelectorAll(".nav-group.open").forEach(function (g) {
        g.classList.remove("open");
      });
    }
  });
});
