
document.addEventListener("DOMContentLoaded", () => {
  const rows = document.querySelectorAll(
    ".project-gallery-group--row"
  );

  function sizeRow(row) {
    const images = [...row.querySelectorAll("img")];

    if (
      images.length === 0 ||
      images.some(
        (img) => !img.complete || !img.naturalWidth || !img.naturalHeight
      )
    ) {
      return;
    }

    const styles = getComputedStyle(row);
    const gap = parseFloat(styles.columnGap) || 0;
    const availableWidth =
      row.clientWidth - gap * (images.length - 1);

    if (availableWidth <= 0) return;

    const totalRatio = images.reduce(
      (sum, img) => sum + img.naturalWidth / img.naturalHeight,
      0
    );

    if (totalRatio <= 0) return;

    const height = availableWidth / totalRatio;

    row.style.setProperty("--gallery-row-height", `${height}px`);
  }

  rows.forEach((row) => {
    const images = [...row.querySelectorAll("img")];

    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", () => sizeRow(row));
        img.addEventListener("error", () => sizeRow(row));
      }
    });

    sizeRow(row);
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver((entries) => {
      entries.forEach(({ target }) => sizeRow(target));
    });

    rows.forEach((row) => observer.observe(row));
  } else {
    window.addEventListener("resize", () => {
      rows.forEach(sizeRow);
    });
  }
});
