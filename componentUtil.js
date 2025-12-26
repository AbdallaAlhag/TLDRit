function createTLDRitButton() {
  const btn = document.createElement("button");
  btn.id = "tldrit-summary-button";
  btn.textContent = "Summarize";
  btn.style.cssText = `
  background: #272729;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #343536;
  color: #d7dadc;
  padding: 12px 12px;
  font-size: 12px;
  border-radius: 15px;
  cursor: pointer;
  margin-top: 8px;
  font-family: "Noto Sans", Arial, sans-serif;
  transition: background 0.2s, border 0.2s;
`;

  btn.onmouseover = () => {
    btn.style.background = "#343536";
    btn.style.border = "1px solid #484848";
  };

  btn.onmouseout = () => {
    btn.style.background = "#272729";
    btn.style.border = "1px solid #343536";
  };
  detectLightOrDarkMode(btn);
  return btn;
}
function detectLightOrDarkMode(element) {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (isDark) return;
  if (element.id === "tldrit-summary-button") {
    element.style.background = "#f6f7f8";
    element.style.border = "1px solid #ccc";
    element.style.color = "#1c1c1c";
  }
  if (element.id === "tdrit-summary-comment") {
    element.style.background = "#fff";
    element.style.border = "1px solid #ddd";
    element.style.color = "#1c1c1c";
  }
}

function createTLDRitSummary() {
  const container = document.createElement("div");
  container.style.cssText = `
  background: #1a1a1b;
  border: 1px solid #343536;
  padding: 12px;
  margin-bottom: 12px;
  margin-top: 8px;
  border-radius: 6px;
  font-size: 14px;
  color: #d7dadc; /* Reddit dark text color */
  font-family: "Noto Sans", Arial, sans-serif;
  line-height: 1.4;
`;
  container.id = "tldrit-summary-comment";
  detectLightOrDarkMode(container);
  return container;
}
export { createTLDRitButton, createTLDRitSummary };
