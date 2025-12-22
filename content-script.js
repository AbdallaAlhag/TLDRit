function getArticleLink() {
  const post = document.querySelector('[slot="post-media-container"]');
  if (!post) {
    console.log("No Article");
    return null;
  }
  const outboundLink = post.querySelector('a[href^="http"]')?.href;
  console.log("Article Link: ", outboundLink);
  return outboundLink || null;
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
  getArticleLink();
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
