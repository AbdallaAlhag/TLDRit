// TODO:
// [✔] cache summary with page id
// [✔] add loading or spinner with a loading bar or countdown
// [✔] check and clear cache
// [ ] check permission, but also need to add an option to toggle auto summary
// [ ] option page with ability to change prompt and easier open ai key input isntead of dev tools.
// [ ] (maybe a additional server that i could host that caches it so it would save users tokens)
//
//
// Current bugs:
// Summarize button does not show up sometimes
// Article link is not always the one in the post.

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

  let subredditId = location.pathname.split("/")[4];

  let url = getArticleLink();
  console.log("Current article url: ", url);
  let postTitle = document.querySelector('[id^="post-title-"]').textContent;
  postTitle = postTitle.slice(0, 300).trim();
  // console.log(postTitle);

  if (url && !isSummarizable(url)) return;

  // const btn = createTLDRitButton();

  const { container, spinner, btn } = createTLDRitButtonWithSpinner();

  const articleUrl = getArticleLink();
  const origin = new URL(articleUrl).origin + "/*";

  // checking host permission
  // won't use this at the moment since we don't want to auto
  // summarize since it takes tokens right now. Maybe add an option to that.

  // chrome.runtime.sendMessage(
  //   { type: "CHECK_PERMISSION", origin },
  //   (response) => {
  //     console.log("response", response);
  //     if (response.granted) {
  //       console.log("response granted");
  //     } else {
  //       console.log("response not granted");
  //     }
  //   },
  // );

  btn.onclick = async () => {
    if (document.getElementById("tldrit-summary-comment")) {
      console.log("summary already exists");
      return;
    }

    let cachedSummary;
    let openaiKey;
    chrome.storage.local.get([subredditId, "openaiKey"], async (result) => {
      cachedSummary = result[subredditId];
      openaiKey = result.openaiKey;
      console.log(cachedSummary, openaiKey);
      if (!openaiKey) {
        injectSummary(
          "Missing openai key, please open popup and input your openai key",
        );
        return;
      }
      console.log("cachedSummary", cachedSummary);
      const isCacheEmpty =
        !cachedSummary || Object.keys(cachedSummary).length === 0;
      if (!isCacheEmpty) {
        injectSummary(cachedSummary.summary);
        console.log("summary already cached, went ahead and inected it");
        return;
      } else {
        console.log("No summary cached, going ahead and fetching");
      }

      spinner.style.display = "inline-block"; // show spinner
      btn.disabled = true; // optional: disable button while loading

      // chrome.runtime.sendMessage(
      //   { type: "REQUEST_PERMISSION", origin },
      //   (response) => {
      //     if (!response?.granted) {
      //       alert("Permission denied");
      //       return;
      //     }
      //
      //     chrome.runtime.sendMessage(
      //       { type: "FETCH_ARTICLE_HTML", url: articleUrl },
      //       (res) => {
      //         if (res?.error) {
      //           console.error(res.error);
      //           injectSummary("Failed to fetch article");
      //
      //           return;
      //         }
      //
      //         // DOMParser allowed in content script
      //         const doc = new DOMParser().parseFromString(res.html, "text/html");
      //         let text = doc.body.innerText.replace(/\s+/g, " ").trim();
      //         const MAX_CHARS = 8000; // safe upper bound
      //
      //         text = text.slice(0, MAX_CHARS);
      //         // console.log(text);
      //         // send extracted text to background to summarize
      //         chrome.runtime.sendMessage(
      //           { type: "SUMMARIZE_TEXT", text, title: postTitle },
      //
      //           async (summaryRes) => {
      //             await chrome.storage.local.set({
      //               [subredditId]: summaryRes.summary,
      //             });
      //             injectSummary(summaryRes.summary);
      //
      //           },
      //         );
      //       },
      //     );
      //   },
      // );
      try {
        // Request permission
        const permRes = await sendMessageAsync({
          type: "REQUEST_PERMISSION",
          origin,
        });

        if (!permRes?.granted) {
          alert("Permission denied");
          return;
        }

        // Fetch article HTML
        const fetchRes = await sendMessageAsync({
          type: "FETCH_ARTICLE_HTML",
          url: articleUrl,
        });

        if (fetchRes?.error) {
          console.error(fetchRes.error);
          injectSummary("Failed to fetch article");
          return;
        }

        // Parse article
        const doc = new DOMParser().parseFromString(fetchRes.html, "text/html");
        let text = doc.body.innerText.replace(/\s+/g, " ").trim();
        const MAX_CHARS = 8000;
        text = text.slice(0, MAX_CHARS);

        // Summarize text
        const summaryRes = await sendMessageAsync({
          type: "SUMMARIZE_TEXT",
          text,
          title: postTitle,
        });

        // Store & inject summary
        await chrome.storage.local.set({
          [subredditId]: { summary: summaryRes.summary, timestamp: Date.now() },
        });
        injectSummary(summaryRes.summary);
      } catch (err) {
        console.error("Error in TLDR workflow:", err);
        injectSummary("Something went wrong while summarizing");
      } finally {
        // Clean up spinner / re-enable button if needed
        if (spinner) spinner.style.display = "none";
        btn.disabled = false;
      }
    });
  };

  const commentObserver = new MutationObserver(() => {
    const commentSection = document.querySelector(
      '[id^="comment-tree-content-anchor-"]',
    );
    if (!commentSection) return;

    // commentSection.before(btn);
    commentSection.before(container);

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
  const container = createTLDRitSummary();
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

// UTIL FUNCTIONS ********************************************

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

// function showSpinner() {
//   const spinner = document.createElement("div");
//   spinner.id = "tldrit-spinner";
//   spinner.style.cssText = `
//     position: fixed;
//     top: 50%;
//     left: 50%;
//     transform: translate(-50%, -50%);
//     z-index: 9999;
//     border: 8px solid #f3f3f3;
//     border-top: 8px solid #3498db;
//     border-radius: 50%;
//     width: 60px;
//     height: 60px;
//     animation: spin 1s linear infinite;
//   `;
//
//   // Add keyframes for spin animation
//   const style = document.createElement("style");
//   style.textContent = `
//     @keyframes spin {
//       0% { transform: translate(-50%, -50%) rotate(0deg); }
//       100% { transform: translate(-50%, -50%) rotate(360deg); }
//     }
//   `;
//
//   document.head.appendChild(style);
//
//   document.body.appendChild(spinner);
//   console.log("show spinner called");
// }
//
// function hideSpinner() {
//   const spinner = document.getElementById("tldrit-spinner");
//   console.log("hiding spinner called");
//   if (spinner) spinner.remove();
// }

function createTLDRitButtonWithSpinner() {
  // Container to hold button + spinner
  const container = document.createElement("div");
  container.style.display = "inline-flex";
  container.style.alignItems = "center";
  container.style.gap = "8px"; // space between button and spinner

  // Button
  const btn = document.createElement("button");
  btn.id = "tldrit-summary-button";
  btn.textContent = "TLDRit";
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

  // Spinner (hidden initially)
  const spinner = document.createElement("div");
  spinner.id = "tldrit-spinner";
  spinner.style.cssText = `
    width: 16px;
    height: 16px;
    border: 2px solid #d7dadc;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: none; /* hidden initially */
  `;

  // Add spinner keyframes (only once)
  if (!document.getElementById("tldrit-spinner-style")) {
    const style = document.createElement("style");
    style.id = "tldrit-spinner-style";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(btn);
  container.appendChild(spinner);

  return { container, btn, spinner };
}

function sendMessageAsync(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}
