const keyInput = document.getElementById("AIKey");
const statusInfo = document.getElementById("status");
const btn = document.getElementById("save");

btn.addEventListener("click", async () => {
  statusInfo.textContent = "Checking Key...";
  let { valid, reason } = await checkKey(keyInput.value.trim());
  console.log(valid, reason);
  if (!valid) {
    statusInfo.textContent = `❌ ${reason}`;
    statusInfo.style.color = "red";
    return;
  }
  chrome.storage.local.set({ openaiKey: keyInput.value }, () => {
    statusInfo.textContent = reason;
    statusInfo.style.color = "green";
    keyInput.textContent = "";
    setTimeout(() => (statusInfo.textContent = ""), 1000);
  });
});

async function checkKey(apiKey) {
  // assuming all keys start with sk- then certain amount of keys.
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return { valid: false, reason: "Invalid API key format" };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (res.status === 401) {
      return { valid: false, reason: "Unauthorized (invalid key)" };
    }

    if (!res.ok) {
      return { valid: false, reason: `Error ${res.status}` };
    }

    // If we get here, the key is valid
    return { valid: true, reason: "✅ Key Validated, Settings saved." };
  } catch (err) {
    return { valid: false, reason: "Network error" };
  }
}
