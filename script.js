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

  /**
   * Sends telemetry to backend API.
   * @param {string} event - Event name
   * @param {Object} [data={}] - Custom event payload
   * @param {boolean|string} [dedupeKey=false] - If false/string, enforces single-fire rule. If true, allows duplicates.
   */
  function send(event, data = {}, dedupeKey = false) {
    if (dedupeKey !== true) {
      const key = typeof dedupeKey === "string" ? dedupeKey : event;
      if (sentKeys.has(key)) return;
      sentKeys.add(key);
    }

    const payload = JSON.stringify({
      trackingId,
      sessionId,
      event,
      timestamp: Date.now(),
      initialState,
      data,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  send("page_loaded");

  // --- Scroll Depth Tracking ---
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

  // --- Active Time on Page Tracking ---
  const timeMilestones = [10, 30, 60];
  let activeTimeMs = 0;
  let lastTick = Date.now();

  function checkTimeMilestones() {
    const now = Date.now();
    if (document.visibilityState === "visible") {
      activeTimeMs += now - lastTick;
      const activeSeconds = Math.floor(activeTimeMs / 1000);

      timeMilestones.forEach((s) => {
        if (activeSeconds >= s) {
          send(`time_${s}s`, { activeMs: activeTimeMs });
        }
      });
    }
    lastTick = now;
  }

  const timeInterval = setInterval(checkTimeMilestones, 1000);

  // --- Event Delegation for CTA Clicks ---
  document.addEventListener("click", (e) => {
    const target = e.target.closest("a, button");
    if (!target) return;

    const label = (
      target.getAttribute("href") ||
      target.dataset.tab ||
      target.textContent.trim()
    ).slice(0, 60);

    if (/how|book/i.test(label)) {
      // Keyed by label so clicking a new CTA works, but rapid double-clicking the same CTA is suppressed
      send("cta_clicked", { label }, `cta_clicked:${label}`);
    }
  });

  // --- Form Interaction & Submission ---
  const leadForm = document.querySelector("form");
  if (leadForm) {
    let formStarted = false;

    leadForm.addEventListener("focusin", () => {
      if (!formStarted) {
        formStarted = true;
        send("form_started");
      }
    });

    leadForm.addEventListener("submit", () => {
      send("form_submitted", {}, true); // Allow retry submissions if form fails
    });
  }

  // --- Visibility & Window Unload Tracking ---
  document.addEventListener("visibilitychange", () => {
    // Flush any pending active time before backgrounding or resuming
    checkTimeMilestones();

    // Allow multiple visibility logs over a session lifecycle
    send(
      document.visibilityState === "hidden" ? "page_hidden" : "page_visible",
      { atMs: Date.now() - startedAt },
      true
    );
  });

  window.addEventListener("pagehide", () => {
    clearInterval(timeInterval);
    send("page_hide", { atMs: Date.now() - startedAt }, true);
  });
})();