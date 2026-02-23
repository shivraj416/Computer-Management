// 🕒 LIVE CLOCK
function updateClock() {
    const now = new Date();
    const clock = document.getElementById("liveClock");
    if (clock) {
        clock.innerText = now.toLocaleTimeString();
    }
}
setInterval(updateClock, 1000);
updateClock();

// ⬆ BACK TO TOP
const topBtn = document.getElementById("topBtn");
window.addEventListener("scroll", function () {
    if (topBtn) {
        topBtn.style.display =
            document.documentElement.scrollTop > 200 ? "block" : "none";
    }
});

function scrollTopPage() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// 🌙 DARK/LIGHT TOGGLE
function toggleMode() {
    document.body.classList.toggle("light-mode");
}

// 📧 NEWSLETTER
function subscribe(e) {
    e.preventDefault();
    document.getElementById("subscribeMsg").innerText =
        "Subscribed Successfully!";
    document.getElementById("newsletterEmail").value = "";
}