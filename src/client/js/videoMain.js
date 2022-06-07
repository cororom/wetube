const hashtagLeftBtn = document.querySelector(".hashtag__left-arrow-button .material-icons");
const hashtagRightBtn = document.querySelector(".hashtag__right-arrow-button .material-icons");
const hashtagBtn = document.querySelectorAll(".hashtag-grid .hashtag-mixin");
const videoSection = document.querySelector(".video-grid");

const previewVideo = (event) => {
  const { target } = event;
  const videoContainer = target.closest(".video-item");
  const videoId = videoContainer.dataset.id;
  location.href = `/videos/${videoId}`;
};

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

const hashtagsScroll = (event, direction) => {
  event.preventDefault();
  const content = document.querySelector(".hashtag-grid");
  const leftArrowSection = document.querySelector(".hashtag__left-arrow");
  const rightArrowSection = document.querySelector(".hashtag__right-arrow");
  if (direction === "left") {
    content.scrollLeft -= 300;
    rightArrowSection.classList.remove("close");
    if (content.scrollLeft === 0) {
      leftArrowSection.classList.add("close");
    }
  } else {
    const maxScrollLeft = content.scrollWidth - content.clientWidth;
    content.scrollLeft += 300;
    leftArrowSection.classList.remove("close");
    if (content.scrollLeft === maxScrollLeft) {
      rightArrowSection.classList.add("close");
    }
  }
};

const setVideos = (video, uploadedTime) => {
  const videoItem = document.createElement("div");
  videoItem.className = "video-mixin video-item";
  videoItem.dataset.id = video._id;
  videoItem.dataset.preview = `/${video.previewUrl}`;
  videoItem.dataset.thumb = `/${video.thumbUrl}`;
  const thumb = document.createElement("div");
  thumb.style = `background-image:url(/${video.thumbUrl});background-size:cover;background-position:center;`;
  thumb.className = "video-mixin__thumb";
  const data = document.createElement("div");
  data.className = "video-mixin__data";
  const author = document.createElement("div");
  author.className = "video-mixin__author";
  const img = document.createElement("img");
  img.src =
    video.owner.avatarUrl !== undefined
      ? video.owner.avatarUrl
      : "https://yt3.ggpht.com/ytc/AKedOLS8CWf3Z4Q7MlUICz8ViNWqytCgcMm-t3ZkkCe1OEAUGCPmxqVJud58ULUlRFjs=s88-c-k-c0x00ffffff-no-rj-mo";
  const meta = document.createElement("div");
  meta.className = "video-mixin__meta";
  const title = document.createElement("h3");
  title.className = "video-mixin__title";
  title.textContent = video.title;
  const a = document.createElement("a");
  a.href = `/users/${video.owner._id}`;
  a.textContent = video.owner.name;
  const span = document.createElement("span");
  let metaText = video.meta.views;
  metaText += video.meta.views === 1 ? " view" : " views";
  if (uploadedTime) {
    metaText += `• ${uploadedTime[video._id].diff} ${uploadedTime[video._id].unit}`;
  }
  span.textContent = metaText;
  author.appendChild(img);
  data.appendChild(author);
  meta.appendChild(title);
  meta.appendChild(a);
  meta.appendChild(span);
  data.appendChild(meta);
  videoItem.appendChild(thumb);
  videoItem.appendChild(data);
  videoSection.appendChild(videoItem);
  previewInit();
};

const reloadingHashtag = async (event) => {
  event.preventDefault();
  const { target } = event;
  const response = await fetch(`/api/videos/${target.innerText}/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.status === 200) {
    const hashtags = document.querySelectorAll(".hashtag-grid .hashtag-mixin");
    hashtags.forEach((hashtag) => {
      if (hashtag.contains(target)) {
        hashtag.classList.add("selected");
      } else {
        hashtag.classList.remove("selected");
      }
    });
    const { videos, uploadedTime } = await response.json();
    if (videos.length > 0) {
      videoSection.textContent = "";
      videos.forEach((video) => {
        setVideos(video, uploadedTime);
      });
    }
  }
};

function previewInit() {
  const videos = document.querySelectorAll(".video-item");
  if (videos) {
    videos.forEach((video) => {
      video.addEventListener("click", previewVideo);
      video.addEventListener("mouseenter", thumbChange);
      video.addEventListener("mouseleave", thumbChange);
    });
  }
}

previewInit();

if (hashtagLeftBtn) {
  hashtagLeftBtn.addEventListener("click", (event) => {
    hashtagsScroll(event, "left");
  });
}

if (hashtagRightBtn) {
  hashtagRightBtn.addEventListener("click", (event) => {
    hashtagsScroll(event, "right");
  });
}

if (hashtagBtn) {
  hashtagBtn.forEach((hashtag) => {
    hashtag.addEventListener("click", reloadingHashtag);
  });
}
