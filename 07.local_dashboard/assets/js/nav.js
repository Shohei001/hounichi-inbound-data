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

document.addEventListener("DOMContentLoaded", function () {
  var backTop = document.querySelector(".news-back-top");
  if (backTop) {
    var onScroll = function () {
      backTop.classList.toggle("show", window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    backTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  var sideLinks = document.querySelectorAll(".news-side-toc a[href^='#']");
  if (sideLinks.length && "IntersectionObserver" in window) {
    var map = {};
    sideLinks.forEach(function (a) {
      map[a.getAttribute("href").slice(1)] = a;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            sideLinks.forEach(function (a) { a.classList.remove("current"); });
            var link = map[entry.target.id];
            if (link) link.classList.add("current");
          }
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
});
