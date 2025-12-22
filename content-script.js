function getArticleLink() {
  const post = document.querySelector('[slot="post-media-container"]');
  if (!post) {
    console.log("No Article");
    return null;
  }
  console.log("post: ", !post);
  const outboundLink = post.querySelector('a[href^="http"]')?.href;
  console.log(outboundLink);
  if (!outboundLink) {
    console.log("Found media post but no article link");
    return null;
  }
  console.log("Article Link: ", outboundLink);
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
  console.log("Running logic for Reddit post page");
  // your summarizer logic here
  let url = getArticleLink();
  if (!isSummarizable(url)) return;

  chrome.runtime.sendMessage(
    {
      type: "SUMMARIZE_ARTICLE",
      url: url,
    },
    (response) => {
      console.log("got summary from background: ", response.summary);
      injectSummary(response.summary);
    },
  );
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
  container.style.cssText = `
    background: #1a1a1b;
    border: 1px solid #343536;
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 6px;
    font-size: 14px;
  `;

  container.innerHTML = `
    <strong>AI Summary</strong>
    <ul>
      ${summary
        .split("\n")
        .map((line) => `<li>${line}</li>`)
        .join("")}
    </ul>
  `;

  const comments = document.querySelector(
    '[data-testid="comment-top-meta"]',
  )?.parentElement;

  if (comments) {
    comments.prepend(container);
  }
}
