const params = new URLSearchParams(location.search);
const to = params.get("to");
const retry = () => {
  if (to) location.href = to;
};
document.getElementById("retry").addEventListener("click", retry);
window.addEventListener("online", retry);

// The error the load failed with (for example -105 ERR_NAME_NOT_RESOLVED), so "offline" can be told apart from a blocked or broken load.
// Only the code and its name are shown; they hold no address or personal detail.
const code = params.get("code");
const reason = params.get("reason");
if (code && /^-?\d{1,5}$/.test(code)) {
  const why = document.getElementById("why");
  why.textContent = `Error ${code}${reason && /^[A-Z0-9_]{1,60}$/.test(reason) ? ` ${reason}` : ""}`;
  why.hidden = false;
}
