// Apply before the app and styles load, without an inline script (CSP stays strict).
(() => {
  let preference;
  try { preference = localStorage.getItem("annu.theme"); } catch {}
  const dark = preference === "dark" ||
    (preference !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();
