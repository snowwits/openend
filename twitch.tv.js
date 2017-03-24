function doInject() {
	// Inject the script with the functionality that requires access to the Twitch.Player API
	// content_scripts of Chrome extensions do not have access to global variables of the actual page,
	// so we need to inject a script into the actual page.
	var injectedScript = document.createElement("SCRIPT");
	injectedScript.src = chrome.extension.getURL("oe_twitch.tv_injected.js");
	injectedScript.onload = function() {
		this.remove();
	};
	(document.head || document.documentElement).appendChild(injectedScript);
	console.log("OPENEND: Injected script " + injectedScript.src)
}

window.onload = doInject;