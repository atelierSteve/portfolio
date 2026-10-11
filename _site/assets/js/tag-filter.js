document.addEventListener("DOMContentLoaded", () => {
  const filterButtons = document.querySelectorAll("[data-filter]");
  const projectCards = document.querySelectorAll(".project-card");

  if (!filterButtons.length || !projectCards.length) {
    return;
  }

  function filterProjects(filter) {
    projectCards.forEach((card) => {
      const tags = (card.dataset.tags || "").split(/\s+/).filter(Boolean);
      const isFeatured = card.dataset.featured === "true";

      let shouldShow = false;

      if (filter === "all") {
        shouldShow = true;
      } else if (filter === "featured") {
        shouldShow = isFeatured;
      } else {
        shouldShow = tags.includes(filter);
      }

      card.hidden = !shouldShow;
    });

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === filter;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterProjects(button.dataset.filter);
    });
  });

  // Start with Featured if available; otherwise show All.
  const initialFilter = [...filterButtons].some(
    (button) => button.dataset.filter === "featured"
  )
    ? "featured"
    : "all";

  filterProjects(initialFilter);
});