export default defineBackground(() => {
	console.log("Hello background!", { id: browser.runtime.id });

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
