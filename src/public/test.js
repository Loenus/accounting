function navigateTo(path) {
    /*if (!document.startViewTransition) {
      window.location.href = path;
      return;
    }*/
    document.startViewTransition(() => {
      window.location.href = path;
    });
}

const btn = document.getElementById("btn");
btn.addEventListener("click", function (e) {
  navigateTo("/test");
});
  