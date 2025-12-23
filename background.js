chrome.storage.local.get("openaiKey", ({ openaiKey }) => {
  if (!openaiKey) {
    chrome.storage.local.set({ openaiKey: "sk-xxxx" }, () => {
      console.log("API key saved locally");
    });
  } else {
    console.log("API key already exists in storage");
  }
});

const PROMPT = `Summarize the following article in 5–7 bullet points.
Focus on:
- The main claim
- Key evidence
- Any conclusions or implications

Write concisely and neutrally.

Article:
{{TEXT}}`;

async function fetchArticleHtml(url) {
  const res = await fetch(url);
  return await res.text();
}

async function summarize(text) {
  const prompt = PROMPT.replace("{{TEXT}}", text);
  console.log("grabbing summary from chatgpt ");
  // Get the API key from chrome.storage.local
  const { openaiKey } = await new Promise((resolve) => {
    chrome.storage.local.get("openaiKey", resolve);
  });

  if (!openaiKey) {
    console.error("OpenAI API key not set in chrome.storage.local");
    return "Error: API key not found";
  }
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

  const data = await res.json();
  console.log(data.choices[0].message.content);
  return data.choices[0].message.content;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REQUEST_PERMISSION") {
    chrome.permissions.request({ origins: [msg.origin] }, (granted) => {
      sendResponse({ granted });
    });
    return true; // IMPORTANT: keeps sendResponse alive
  }
  if (msg.type === "FETCH_ARTICLE_HTML") {
    fetch(msg.url)
      .then((res) => res.text())
      .then((html) => sendResponse({ html }))
      .catch(() => sendResponse({ error: true }));
    return true;
  }
  if (msg.type === "SUMMARIZE_TEXT") {
    summarize(msg.text) // your existing summarize function
      .then((summary) => sendResponse({ summary }))
      .catch(() => sendResponse({ summary: "Error summarizing article" }));
    return true; // async sendResponse
  }
});
