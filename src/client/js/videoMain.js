const videos = document.querySelectorAll(".video-mixin");

const thumbChange = (event) => {
  const { target, type } = event;
  const videoThumb = target.querySelector(".video-mixin__thumb");
  if (type === "mouseenter") {
    const { preview } = target.dataset;
    videoThumb.style.backgroundImage = `url("${preview}")`;
  } else {
    const { thumb } = target.dataset;
    videoThumb.style.backgroundImage = `url("${thumb}")`;
  }
};

if (videos) {
  videos.forEach((video) => {
    video.addEventListener("mouseenter", thumbChange);
    video.addEventListener("mouseleave", thumbChange);
  });
}
