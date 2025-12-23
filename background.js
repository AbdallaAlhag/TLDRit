chrome.storage.local.get("openaiKey", ({ openaiKey }) => {
  if (!openaiKey) {
    chrome.storage.local.set({ openaiKey: "sk-xxxx" }, () => {
      console.log("API key saved locally");
    });
  } else {
    console.log("API key already exists in storage");
  }
});

const PROMPT = `You are writing a detailed Reddit comment summarizing an article for other users. Follow these instructions carefully:

- Write in a natural Reddit comment style, as if you read the article thoroughly.
- Reference or quote the most important points from the article (1–2 key sentences per point).
- Connect the content directly to the Reddit post's title, showing why it’s relevant.
- Include the main claim, key evidence, and major conclusions or implications.
- Focus on giving the reader the full story without unnecessary fluff or filler.
- Use 1–3 paragraphs depending on the complexity of the article.
- Keep a neutral, informative tone — like an insightful Reddit user explaining the article to others.

Reddit post title: "{{TITLE}}"

Article content:
{{TEXT}}

Write the comment below:`;

async function fetchArticleHtml(url) {
  const res = await fetch(url);
  return await res.text();
}

async function summarize(text, title) {
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
    summarize(msg.text, msg.title) // your existing summarize function
      .then((summary) => sendResponse({ summary }))
      .catch(() => sendResponse({ summary: "Error summarizing article" }));
    return true; // async sendResponse
  }
});
