

function showChronicles() {
  hideAll();
  document.getElementById("chronicles").style.display = "block";
}

function showHome() {
  hideAll();
  document.getElementById("home").style.display = "flex";
}




function hideAll() {
  document.getElementById("home").style.display = "none";
  document.getElementById("chronicles").style.display = "none";
}