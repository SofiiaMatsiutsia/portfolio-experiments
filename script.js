const CARD_HOVER_COLORS = ["#4DCCF9", "#E8A7ED", "#86CD8B", "#F6AA81"];

document.querySelectorAll(".card__media").forEach((media) => {
  media.addEventListener("mouseenter", () => {
    const color = CARD_HOVER_COLORS[Math.floor(Math.random() * CARD_HOVER_COLORS.length)];
    media.style.setProperty("--card-fill", color);
  });

  media.addEventListener("mouseleave", () => {
    media.style.removeProperty("--card-fill");
  });
});

const menuOverlay = document.getElementById("menu-overlay");
const menuOpenBtn = document.getElementById("menu-open");
const menuCloseBtn = document.getElementById("menu-close");

function openMenu() {
  menuOverlay.hidden = false;
  menuOpenBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  menuOverlay.hidden = true;
  menuOpenBtn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

menuOpenBtn.addEventListener("click", openMenu);
menuCloseBtn.addEventListener("click", closeMenu);

const soundToggle = document.querySelector(".sound-toggle");
soundToggle.addEventListener("click", () => {
  const muted = soundToggle.getAttribute("aria-pressed") === "true";
  soundToggle.setAttribute("aria-pressed", String(!muted));
  soundToggle.setAttribute("aria-label", muted ? "Mute" : "Unmute");
});
