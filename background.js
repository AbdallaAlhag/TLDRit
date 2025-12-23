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

async function fetchArticleText(url) {
  const granted = await ensureHostPermission(url);

  if (!granted) {
    throw new Error("User denied site permission");
  }
  const res = await fetch(url);
  const html = await res.text();

  // Strip HTML → text (basic approach)
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.innerText.slice(0, 15000); // limit tokens
}

async function summarize(text) {
  const prompt = PROMPT.replace("{{TEXT}}", text);

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
  if (msg.type === "SUMMARIZE_ARTICLE") {
    fetchArticleText(msg.url)
      .then((text) => summarize(text)) // use your async summarize
      .then((summary) => sendResponse({ summary }))
      .catch((err) => {
        console.error(err);
        sendResponse({ summary: "Error summarizing article" });
      });
    return true; // must return true for async sendResponse
  }
});
