const $ = (s) => document.querySelector(s);
let token = sessionStorage.getItem("portalToken");

function showStatus(message, isError = true) {
  $("#status").textContent = message;
  $("#status").style.color = isError ? "#a02d37" : "#167447";
}
function showDashboard(user) {
  $("#authPanel").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  $("#welcome").textContent = `Hello, ${user.name}`;
  $("#userMeta").textContent = `${user.email} · Role: ${user.role}`;
}
function showAuth() {
  $("#authPanel").classList.remove("hidden");
  $("#dashboard").classList.add("hidden");
}
async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
async function handleAuth(event, endpoint) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api(endpoint, { method: "POST", body: JSON.stringify(body) });
    token = data.token;
    sessionStorage.setItem("portalToken", token);
    showDashboard(data.user);
    showStatus(data.message, false);
    form.reset();
  } catch (err) { showStatus(err.message); }
}
$("#registerForm").addEventListener("submit", e => handleAuth(e, "/api/auth/register"));
$("#loginForm").addEventListener("submit", e => handleAuth(e, "/api/auth/login"));

document.querySelectorAll("[data-endpoint]").forEach(button => {
  button.addEventListener("click", async () => {
    try {
      const data = await api(button.dataset.endpoint);
      $("#result").textContent = JSON.stringify(data, null, 2);
      showStatus("Protected request successful.", false);
    } catch (err) {
      $("#result").textContent = err.message;
      showStatus(err.message);
    }
  });
});
$("#logout").addEventListener("click", () => {
  token = null;
  sessionStorage.removeItem("portalToken");
  $("#result").textContent = "You are logged out.";
  showAuth();
  showStatus("Logged out successfully.", false);
});

(async function restoreSession() {
  if (!token) return;
  try {
    const data = await api("/api/auth/me");
    showDashboard(data.user);
  } catch {
    token = null;
    sessionStorage.removeItem("portalToken");
    showAuth();
  }
})();