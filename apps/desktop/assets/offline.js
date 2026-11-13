const to = new URLSearchParams(location.search).get("to");
const retry = () => {
  if (to) location.href = to;
};
document.getElementById("retry").addEventListener("click", retry);
window.addEventListener("online", retry);
