function getArticleLink() {
  const post = document.querySelector('[slot="post-media-container"]');
  if (!post) return null;

  const outboundLink = post.querySelector('a[href^="http"]')?.href;
  console.log("Article Link: ", outboundLink);
  return outboundLink || null;
}
// page does not refresh.
console.log("testing if content script is running");
getArticleLink();
