const menu = document.getElementById("menu");

const handleDrawer = () => {
  const drawer = document.querySelector(".drawer");
  drawer.classList.toggle("opened");
};

if (menu) {
  menu.addEventListener("click", handleDrawer);
}
