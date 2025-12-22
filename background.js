const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROMPT = `Summarize the following article in 5–7 bullet points.
Focus on:
- The main claim
- Key evidence
- Any conclusions or implications

Write concisely and neutrally.

Article:
{{TEXT}}`;

async function fetchArticleText(url) {
  const res = await fetch(url);
  const html = await res.text();

  // Strip HTML → text (basic approach)
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.innerText.slice(0, 15000); // limit tokens
}

async function summarize(text) {
  const prompt = PROMPT.replace("{{TEXT}}", text);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
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
