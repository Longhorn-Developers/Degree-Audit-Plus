export default defineBackground(() => {
	console.log("Hello background!", { id: browser.runtime.id });

	// Listen for extension icon click - send message to toggle popup in content script
	browser.action.onClicked.addListener(async (tab) => {
		if (tab.id) {
			try {
				await browser.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" });
			} catch (error) {
				// Content script not loaded on this page - inject it first
				console.log("Content script not ready, injecting...", error);
			}
		}
	});

	// Listen for messages from content scripts
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.action === "openDegreeAudit") {
			const url = browser.runtime.getURL("/degree-audit.html");
			browser.tabs
				.create({ url })
				.then(() => {
					sendResponse({ success: true });
				})
				.catch((error) => {
					sendResponse({ success: false, error: error.message });
				});
			return true; // Keep the message channel open for async response
		}
	});
});
