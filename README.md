# TLDRit

Reddit Post Summarized that shows up as top comment.

Okay, right now 1 request is about 25k input tokens and that makes 2 request
= $0.01. With $5 worth of tokens you can 1000 request.

Articles are being inserted as whole html page but might be easier to select article text.

chrome.local.storage holds up to 5mb unless using unlimtedStorage.
1mb holds arounds 1 million characters (or bytes) which is in the range [125,000 - 250,000 wirds] depending on word length.

Our summary holds around 50 - 150 words + title which tends to be around 25 words.

Clear local storage weekly to ensure we don't hit the limit.

Average summary length: ~1,000–1,200 characters
1 char ≈ 2 bytes in JS string → 1,138 × 2 ≈ 2,276 bytes.
Timestamp + object overhead ~200 bytes

Key (like "1pw4zkb") ~7 bytes

Total per key-value: ~2500 bytes = 2,500/ 2,242,880(~5MB) ≈ 0.05% of 5MB
1,000 sumamries = 50% of storage.
