const DEFAULT_SEEK_AMOUNT = "10m";
const DEFAULT_TWITCH_THEATRE_MODE = false;

// Saves options to chrome.storage.sync.
function saveOptions() {
	// Read option values from elements
	const seekAmount = document.getElementById("seekAmount").value;
	const twitchTheatreMode = document.getElementById("twitchTheatreMode").checked;
	
	// Store option values to storage
	chrome.storage.sync.set({
		seekAmount : seekAmount,
		twitchTheatreMode : twitchTheatreMode
	}, function() {
		showStatusMsg("Options saved.");
	});
}

// Restores option values using the preferences stored in chrome.storage.
function restoreOptions() {
	// Read option values from storage
	chrome.storage.sync.get({
		seekAmount : DEFAULT_SEEK_AMOUNT,
		twitchTheatreMode: DEFAULT_TWITCH_THEATRE_MODE
	}, function(items) {
		// Set option values to elements
		document.getElementById("seekAmount").value = items.seekAmount;
		document.getElementById("twitchTheatreMode").checked = items.twitchTheatreMode;
	});
}

//Restores option values using the preferences stored in chrome.storage.
function restoreDefaultOptions() {
	// Set option values to elements
	document.getElementById("seekAmount").value = DEFAULT_SEEK_AMOUNT;
	document.getElementById("twitchTheatreMode").checked = DEFAULT_TWITCH_THEATRE_MODE;
	showStatusMsg("Restored default options.");
}

function showStatusMsg(msg) {
	// Update status to let user know options were saved.
	const status = document.getElementById("status");
	status.textContent = msg;
	setTimeout(function() {
		status.textContent = "";
	}, 750);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").onclick=saveOptions;
document.getElementById("restoreDefaults").onclick=restoreDefaultOptions;