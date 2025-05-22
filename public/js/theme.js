document.addEventListener("DOMContentLoaded", () => {
  // toggle meniu mobil
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("ul.menu");

  toggle.addEventListener("click", () => {
    menu.classList.toggle("active");
  });

  // switch temă
  const switchInput = document.getElementById("themeToggleSwitch");
  const current = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", current);
  switchInput.checked = current === "dark";

  switchInput.addEventListener("change", () => {
    const mode = switchInput.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
  });
});
