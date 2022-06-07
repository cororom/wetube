const videoContainer = document.getElementById("videoContainer");
const form = document.getElementById("commentForm");

const removeComment = (id) => {
  const li = document.querySelector(`[data-id='${id}']`);
  li.parentNode.removeChild(li);
};

const modifyComment = (text, id) => {
  const videoComment = document.querySelector(`[data-id='${id}']`);
  const form = videoComment.querySelector(".video__comment-form");
  videoComment.removeChild(form);
  const commentInfo = videoComment.querySelector(".comment__info");
  const commentAction = videoComment.querySelector(".comment__action");
  const content = videoComment.querySelector(".comment__text");
  content.innerText = text;
  commentInfo.classList.remove("close");
  commentAction.classList.remove("close");
};

const addComment = (text, id, user) => {
  const videoComments = document.querySelector(".video__comments ul");
  const newComment = document.createElement("li");
  newComment.className = "video__comment";
  newComment.dataset.id = id;
  const a1 = document.createElement("a");
  a1.href = `/users/${user._id}`;
  const avatar = document.createElement("img");
  avatar.className = "comment__avatar";
  avatar.src =
    user.avatarUrl !== ""
      ? user.avatarUrl
      : "https://yt3.ggpht.com/ytc/AKedOLS8CWf3Z4Q7MlUICz8ViNWqytCgcMm-t3ZkkCe1OEAUGCPmxqVJud58ULUlRFjs=s88-c-k-c0x00ffffff-no-rj-mo";
  const div1 = document.createElement("div");
  div1.className = "comment__info";
  const a2 = document.createElement("a");
  a2.href = `/users/${user._id}`;
  const span1 = document.createElement("span");
  span1.className = "comment__owner";
  span1.innerText = user.name;
  const span2 = document.createElement("span");
  span2.className = "comment__text";
  span2.innerText = text;
  const div2 = document.createElement("span");
  div2.className = "comment__action";
  const button1 = document.createElement("button");
  button1.className = "commentEdit";
  button1.innerText = "Edit";
  const button2 = document.createElement("button");
  button2.className = "commentDelete";
  button2.innerText = "Delete";
  a1.appendChild(avatar);
  a2.appendChild(span1);
  div1.appendChild(a2);
  div1.appendChild(span2);
  div2.appendChild(button1);
  div2.appendChild(button2);
  newComment.appendChild(a1);
  newComment.appendChild(div1);
  newComment.appendChild(div2);
  videoComments.prepend(newComment);
  init();
};

const handleEdit = (event) => {
  event.preventDefault();
  const { target } = event;
  const parent = target.closest(".video__comment");
  const commentInfo = parent.querySelector(".comment__info");
  const commentAction = parent.querySelector(".comment__action");
  const commentText = parent.querySelector(".comment__text").innerText;
  const form = document.createElement("form");
  form.className = "video__comment-form";
  form.id = "commentEditForm";
  const textarea = document.createElement("textarea");
  textarea.className = "textarea";
  textarea.cols = "30";
  textarea.rows = "1";
  textarea.innerText = commentText;
  const div = document.createElement("div");
  div.className = "comment__edit";
  const input1 = document.createElement("input");
  input1.className = "cancel-button";
  input1.type = "button";
  input1.value = "CANCEL";
  const input2 = document.createElement("input");
  input2.className = "modify-button";
  input2.type = "submit";
  input2.value = "COMMENT";
  commentInfo.classList.add("close");
  commentAction.classList.add("close");
  div.appendChild(input1);
  div.appendChild(input2);
  form.appendChild(textarea);
  form.appendChild(div);
  parent.appendChild(form);
  init();
};

const handleDelete = async (event) => {
  event.preventDefault();
  const { target } = event;
  const commentId = target.closest(".video__comment").dataset.id;
  const videoId = videoContainer.dataset.id;
  if (commentId === "") {
    return;
  }
  const response = await fetch(`/api/videos/${videoId}/comment/${commentId}/delete`, {
    method: "DELETE",
  });
  if (response.status === 200) {
    const { deleteCommentId } = await response.json();
    removeComment(deleteCommentId);
  }
};

const handleAddBtn = (event) => {
  const { type, target } = event;
  const form = target.closest(".video__comment-form");
  let addBtn;
  if (form.id === "commentForm") {
    addBtn = form.querySelector(".add-button");
  } else {
    addBtn = form.querySelector(".modify-button");
    if (target.className == "cancel-button") {
      const text = form.querySelector(".textarea");
      const commentId = target.closest(".video__comment").dataset.id;
      modifyComment(text.value, commentId);
      return;
    }
  }
  const cancelBtn = form.querySelector(".cancel-button");
  if (type === "focus") {
    addBtn.setAttribute("style", "display:block;");
    cancelBtn.setAttribute("style", "display:block;");
  } else {
    addBtn.removeAttribute("style");
    cancelBtn.removeAttribute("style");
  }
  form.addEventListener("submit", handleSubmit);
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const { target } = event;
  const form = target.closest(".video__comment-form");
  const textarea = form.querySelector("textarea");
  const text = textarea.value;
  const videoId = videoContainer.dataset.id;
  const comment = target.closest(".video__comment");
  if (text === "") {
    return;
  }
  let body;
  if (comment === null) {
    body = JSON.stringify({ text });
  } else {
    const commentId = comment.dataset.id;
    body = JSON.stringify({
      text,
      commentId,
    });
  }
  const response = await fetch(`/api/videos/${videoId}/comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
  if (response.status === 201) {
    textarea.value = "";
    const { newCommentId, mode, user } = await response.json();
    if (mode === "add") {
      addComment(text, newCommentId, user);
    } else {
      modifyComment(text, newCommentId);
    }
  }
};

function init() {
  const commentSection = document.querySelectorAll(".video__comment-form .textarea");
  const cancelBtn = document.querySelectorAll(".cancel-button");
  const editBtn = document.querySelectorAll(".commentEdit");
  const deleteBtn = document.querySelectorAll(".commentDelete");
  if (cancelBtn) {
    cancelBtn.forEach((element) => {
      element.addEventListener("click", handleAddBtn);
    });
  }
  if (commentSection) {
    commentSection.forEach((element) => {
      element.addEventListener("focus", handleAddBtn);
    });
  }
  if (editBtn) {
    editBtn.forEach((element) => {
      element.addEventListener("click", handleEdit);
    });
  }
  if (deleteBtn) {
    deleteBtn.forEach((element) => {
      element.addEventListener("click", handleDelete);
    });
  }
}

init();
