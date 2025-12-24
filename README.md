# TLDRit

Reddit Post Summarized that shows up as top comment.

Okay, right now 1 request is about 25k input tokens and that makes 2 request
= $0.01. With $5 worth of tokens you can 1000 request.

Articles are being inserted as whole html page but might be easier to select article text.

chrome.local.storage holds up to 5mb unless using unlimtedStorage.
1mb holds arounds 1 million characters (or bytes) which is in the range [125,000 - 250,000 wirds] depending on word length.

Our summary holds around 50 - 150 words + title which tends to be around 25 words.

Clear local storage weekly to ensure we don't hit the limit.
