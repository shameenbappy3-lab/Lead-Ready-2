const nextField = document.getElementById("form-next");
if (nextField) {
  nextField.value = `${window.location.origin}/thanks.html`;
}

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".example");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.tab;
    tabs.forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    panels.forEach((panel) => {
      const match = panel.dataset.panel === id;
      panel.classList.toggle("is-active", match);
      panel.hidden = !match;
    });
  });
});

const playButtons = document.querySelectorAll(".play-demo");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

playButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.closest(".example");
    if (!panel) return;
    const miniSteps = panel.querySelectorAll(".mini-step");

    miniSteps.forEach((step) => step.classList.remove("is-lit"));

    if (prefersReducedMotion) {
      miniSteps.forEach((step) => step.classList.add("is-lit"));
      return;
    }

    miniSteps.forEach((step, i) => {
      setTimeout(() => step.classList.add("is-lit"), i * 550);
    });
  });
});

const steps = document.querySelectorAll(".step");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = "0s";
        }
      });
    },
    { threshold: 0.2 }
  );
  steps.forEach((step, i) => {
    step.style.animationDelay = `${i * 0.05}s`;
    io.observe(step);
  });
}


(function trackingInit() {
  const params = new URLSearchParams(window.location.search);
  const trackingId = params.get("c");
 
  if (!trackingId) return;
 
  const sessionId =
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
 
  // Captured once, at load, so a Clarity replay that shows the
  // visitor "landing" on the booking section can be checked
  // against what the browser actually reports here.
  const initialState = {
    url: window.location.href,
    hash: window.location.hash || "",
    scrollY: window.scrollY,
    referrer: document.referrer || "",
    width: window.innerWidth,
    height: window.innerHeight,
  };
 
  const startedAt = Date.now();
  const sentKeys = new Set();
 
  function send(event, data) {
    // Crude de-dupe: don't fire the same milestone twice in one
    // session (e.g. scroll bouncing around 50%).
    const key = event;
    if (sentKeys.has(key)) return;
    sentKeys.add(key);
 
    const payload = JSON.stringify({
      trackingId,
      sessionId,
      event,
      timestamp: Date.now(),
      initialState,
      data: data || {},
    });
 
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      // Fallback for older browsers without sendBeacon.
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }
 
  send("page_loaded");
 
  // --- Scroll depth ---
  const scrollMilestones = [25, 50, 75, 90];
  let scrollTicking = false;
 
  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
 
    requestAnimationFrame(() => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrolledPercent =
        scrollableHeight > 0
          ? Math.round((window.scrollY / scrollableHeight) * 100)
          : 100;
 
      scrollMilestones.forEach((milestone) => {
        if (scrolledPercent >= milestone) {
          send(`scroll_${milestone}`, { scrollPercent: scrolledPercent });
        }
      });
 
      scrollTicking = false;
    });
  });
 
  // --- Time on page ---
  [10, 30, 60].forEach((seconds) => {
    setTimeout(() => send(`time_${seconds}s`), seconds * 1000);
  });
 
  // --- CTA clicks: how-it-works tabs, booking links/buttons ---
  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("click", () => {
      const label = (
        el.getAttribute("href") ||
        el.dataset.tab ||
        el.textContent.trim()
      ).slice(0, 60);
 
      if (/how|book/i.test(label)) {
        send("cta_clicked", { label });
      }
    });
  });
 
  // --- Form interaction / submission ---
  const leadForm = document.querySelector("form");
  if (leadForm) {
    let formStarted = false;
 
    leadForm.addEventListener(
      "focusin",
      () => {
        if (!formStarted) {
          formStarted = true;
          send("form_started");
        }
      },
      { once: false }
    );
 
    leadForm.addEventListener("submit", () => {
      send("form_submitted");
    });
  }
 
  // --- Tab visibility (backgrounded / switched away) ---
  document.addEventListener("visibilitychange", () => {
    send(
      document.visibilityState === "hidden" ? "page_hidden" : "page_visible",
      { atMs: Date.now() - startedAt }
    );
  });
 
  // --- Reliable last-chance beacon on tab close / navigation ---
  window.addEventListener("pagehide", () => {
    send("page_hide", { atMs: Date.now() - startedAt });
  });
})();
 