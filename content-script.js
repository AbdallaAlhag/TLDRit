function getArticleLink() {
  const post = document.querySelector('[slot="post-media-container"]');
  if (!post) {
    console.log("No Article");
    return null;
  }
  const outboundLink = post.querySelector('a[href^="http"]')?.href;
  if (!outboundLink) {
    console.log("Found media post but no article link");
    return null;
  }
  return outboundLink || null;
}
function isSummarizable(url) {
  return (
    url.startsWith("http") &&
    !url.includes("youtube.com") &&
    !url.endsWith(".pdf")
  );
}

let lastUrl = location.href;

function onUrlChange() {
  console.log("URL changed:", location.href);
  runForCurrentPage();
}

function runForCurrentPage() {
  if (!location.pathname.startsWith("/r/")) return;
  if (!location.pathname.includes("/comments/")) return;
  // guard against duplicate injectsion
  if (document.getElementById("tldrit-summary")) return;
  // your summarizer logic here
  let url = getArticleLink();
  let postTitle = document.querySelector('[id^="post-title-"]');

  if (url && !isSummarizable(url)) return;

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
  btn.onclick = () => {
    if (document.getElementById("tldrit-summary-comment")) {
      console.log("summary already exists");
      return;
    }
    const articleUrl = getArticleLink();
    const origin = new URL(articleUrl).origin + "/*";

    chrome.runtime.sendMessage(
      { type: "REQUEST_PERMISSION", origin },
      (response) => {
        if (!response?.granted) {
          alert("Permission denied");
          return;
        }

        chrome.runtime.sendMessage(
          { type: "FETCH_ARTICLE_HTML", url: articleUrl, title: postTitle },
          (res) => {
            if (res.error) {
              injectSummary("Failed to fetch article");
              return;
            }

            // DOMParser allowed in content script
            const doc = new DOMParser().parseFromString(res.html, "text/html");
            const text = doc.body.innerText.replace(/\s+/g, " ").trim();

            // send extracted text to background to summarize
            chrome.runtime.sendMessage(
              { type: "SUMMARIZE_TEXT", text },
              (summaryRes) => {
                injectSummary(summaryRes.summary);
              },
            );
          },
        );
      },
    );
  };

  const commentObserver = new MutationObserver(() => {
    const commentSection = document.querySelector(
      '[id^="comment-tree-content-anchor-"]',
    );
    if (!commentSection) return;

    commentSection.before(btn);
    console.log("btn appended");

    commentObserver.disconnect();
  });

  commentObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
/* 1 Run once on initial load */
runForCurrentPage();

/* 2 Observe SPA navigation */
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onUrlChange();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

function injectSummary(summary) {
  const container = document.createElement("div");
  // container.style.cssText = `
  //   background: #1a1a1b;
  //   border: 1px solid #343536;
  //   padding: 12px;
  //   margin-bottom: 12px;
  //   border-radius: 6px;
  //   font-size: 14px;
  // `;
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
  // container.innerHTML = `
  //   <strong>AI Summary</strong>
  //   <ul>
  //     ${summary
  //       .split("\n")
  //       .map((line) => `<li>${line}</li>`)
  //       .join("")}
  //   </ul>
  // `;
  container.innerText = summary;

  const commentSection = document.querySelector(
    '[id^="comment-tree-content-anchor-"]',
  );

  if (commentSection) {
    console.log("comment found");
    commentSection.prepend(container);
  } else {
    console.log("comment not found");
  }
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
