document.addEventListener("DOMContentLoaded", () => {
  const stages = document.querySelectorAll(".cosmology-stage");

  stages.forEach((stage) => {
    const hotspots = stage.querySelectorAll(".plane-hotspot");

    hotspots.forEach((hotspot) => {
      hotspot.addEventListener("mouseenter", () => {
        stage.style.setProperty("--zoom-x", hotspot.dataset.zoomX || "50%");
        stage.style.setProperty("--zoom-y", hotspot.dataset.zoomY || "50%");
        stage.classList.add("is-zooming");
      });

      hotspot.addEventListener("mouseleave", () => {
        stage.classList.remove("is-zooming");
      });

      hotspot.addEventListener("click", () => {
        hotspots.forEach((other) => {
          if (other !== hotspot) {
            other.classList.remove("active");
          }
        });

        hotspot.classList.toggle("active");

        stage.style.setProperty("--zoom-x", hotspot.dataset.zoomX || "50%");
        stage.style.setProperty("--zoom-y", hotspot.dataset.zoomY || "50%");
        stage.classList.toggle("is-zooming", hotspot.classList.contains("active"));
      });
    });
  });
});

