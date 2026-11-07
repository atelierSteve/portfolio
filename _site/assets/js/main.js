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

// ========================================
// IMAGE LIGHTBOX
// ========================================

const lightbox = document.createElement("dialog");
lightbox.className = "lightbox";

const lightboxImage = document.createElement("img");
lightboxImage.alt = "";

const closeButton = document.createElement("button");
closeButton.className = "lightbox-close";
closeButton.type = "button";
closeButton.setAttribute("aria-label", "Close image");
closeButton.textContent = "×";

lightbox.append(closeButton, lightboxImage);
document.body.append(lightbox);

// Open images only on project pages
if (document.body.dataset.pageType === "project") {
  document.querySelector("main")?.addEventListener("click", (event) => {
  const image = event.target.closest("img");

  if (!image || image.hasAttribute("data-no-lightbox")) {
    return;
  }

  event.preventDefault();

  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;

  lightbox.showModal();
});
}

// Close button
closeButton.addEventListener("click", () => {
  lightbox.close();
});

// Close when clicking the backdrop
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    lightbox.close();
  }
});

// Clear image after closing
lightbox.addEventListener("close", () => {
  lightboxImage.src = "";
});