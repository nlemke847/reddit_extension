chrome.browserAction.onClicked.addListener(function(tab) {
	var newURL = chrome.extension.getURL("home.html");
    chrome.tabs.create({ url: newURL });
});