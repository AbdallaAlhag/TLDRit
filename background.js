chrome.storage.local.get("openaiKey", ({ openaiKey }) => {
  if (!openaiKey) {
    chrome.storage.local.set({ openaiKey: "sk-xxxx" }, () => {
      console.log("API key saved locally");
    });
  } else {
    console.log("API key already exists in storage");
  }
});

const PROMPT = `
Write a concise Reddit-style comment summarizing the article.

Requirements:
- 1–3 short paragraphs
- Neutral, informative tone
- Explain the main claim, key evidence, and conclusions
- Reference 1–2 important sentences or facts
- Connect the summary to the Reddit post title

Reddit post title:
{{TITLE}}

Article:
{{TEXT}}
`;

async function fetchArticleHtml(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch article: ${res.status}`);
  }
  return res.text();
}

async function summarize(text, title) {
  // console.log(text, title);
  const prompt = PROMPT.replace("{{TEXT}}", text).replace("{{TITLE}}", title);
  console.log("grabbing summary from chatgpt ");
  // Get the API key from chrome.storage.local
  const { openaiKey } = await new Promise((resolve) => {
    chrome.storage.local.get("openaiKey", resolve);
  });

  if (!openaiKey) {
    console.error("OpenAI API key not set in chrome.storage.local");
    return "Error: API key not found";
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();

      throw new Error(`OpenAI error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log(data.choices[0].message.content);
    return data.choices[0].message.content;
  } catch (err) {
    console.log("Sumarrize failed: ", err);
    throw err;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REQUEST_PERMISSION") {
    // chrome.permissions.request({ origins: [msg.origin] }, (granted) => {
    chrome.permissions.request(
      {
        origins: ["https://*/*", "http://*/*"],
      },
      (granted) => {
        sendResponse({ granted });
      },
    );
    return true; // IMPORTANT: keeps sendResponse alive
  }
  if (msg.type === "FETCH_ARTICLE_HTML") {
    (async () => {
      try {
        const res = await fetch(msg.url);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        sendResponse({ html });
      } catch (err) {
        console.error("Fetch failed:", err);
        sendResponse({
          error: true,
          message: err.message,
          name: err.name,
        });
      }
    })();

    return true; // keep message channel open
  }
  // fetch(msg.url)
  //   .then((res) => res.text())
  //   .then((html) => sendResponse({ html }))
  //   .catch(() => sendResponse({ error: true }));
  // return true;
  if (msg.type === "SUMMARIZE_TEXT") {
    summarize(msg.text, msg.title) // your existing summarize function
      .then((summary) => sendResponse({ summary }))
      .catch(() => sendResponse({ summary: "Error summarizing article" }));
    return true; // async sendResponse
  }
  if (msg.type === "CHECK_PERMISSION") {
    chrome.permissions.contains({ origins: [msg.origin] }, (granted) => {
      console.log(granted);
      sendResponse({ granted });
    });
    return true;
  }
});
