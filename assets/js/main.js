const stickyHeader = document.querySelector("#portfolio-sticky");
const sentinel = document.querySelector(".sticky-sentinel");

if (stickyHeader && sentinel) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      stickyHeader.classList.toggle(
        "is-stuck",
        entry.boundingClientRect.top < 0
      );
    },
    {
      threshold: 0
    }
  );

  observer.observe(sentinel);
}