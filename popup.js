console.log("Popup script loaded");

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded");
  const optionsBtn = document.getElementById('options');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
      console.log("Opening options page...");
      chrome.runtime.openOptionsPage();
    });
  } else {
    console.error("Options button not found!");
  }
});