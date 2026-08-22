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
