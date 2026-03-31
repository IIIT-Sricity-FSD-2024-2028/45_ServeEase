document.addEventListener("click", function (event) {
  const target = event.target.closest('a[href="#"]');
  if (target) {
    event.preventDefault();
  }
});