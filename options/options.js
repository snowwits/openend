const DEFAULT_HIDE_PROGRESS = true;
const DEFAULT_SEEK_AMOUNT = "10m";
const DEFAULT_TWITCH_THEATRE_MODE = false;

// Saves options to chrome.storage.sync.
function saveOptions() {
	// Read option values from elements
    const hideProgress = document.getElementById("hideProgress").checked;
	const seekAmount = document.getElementById("seekAmount").value;
	const twitchTheatreMode = document.getElementById("twitchTheatreMode").checked;
	
	// Store option values to storage
	chrome.storage.sync.set({
	    hideProgress : hideProgress,
	    seekAmount : seekAmount,
		twitchTheatreMode : twitchTheatreMode
	}, function() {
		showStatusMsg(chrome.i18n.getMessage("options_save_successMsg"));
	});
}

// Restores option values using the preferences stored in chrome.storage.
function restoreOptions() {
	// Read option values from storage
	chrome.storage.sync.get({
	    hideProgress : DEFAULT_HIDE_PROGRESS,
	    seekAmount : DEFAULT_SEEK_AMOUNT,
		twitchTheatreMode: DEFAULT_TWITCH_THEATRE_MODE
	}, function(items) {
		// Set option values to elements
	    document.getElementById("hideProgress").checked = items.hideProgress;
		document.getElementById("seekAmount").value = items.seekAmount;
		document.getElementById("twitchTheatreMode").checked = items.twitchTheatreMode;
	});
}

// Restores option values using the preferences stored in chrome.storage.
function restoreDefaultOptions() {
	// Set option values to elements
    document.getElementById("hideProgress").checked = DEFAULT_HIDE_PROGRESS;
	document.getElementById("seekAmount").value = DEFAULT_SEEK_AMOUNT;
	document.getElementById("twitchTheatreMode").checked = DEFAULT_TWITCH_THEATRE_MODE;
	showStatusMsg(chrome.i18n.getMessage("options_restoreDefaults_successMsg"));
}

function showStatusMsg(msg) {
	// Update status to let user know options were saved.
	const status = document.getElementById("status");
	status.textContent = msg;
	setTimeout(function() {
		status.textContent = "";
	}, 750);
}

// Init elements
// General
document.getElementById("generalLabel").textContent = chrome.i18n.getMessage("options_general");
document.getElementById("hideProgressLabel").textContent = chrome.i18n.getMessage("options_hideProgress");
document.getElementById("seekAmountLabel").textContent = chrome.i18n.getMessage("options_seekAmount");

// Twitch
document.getElementById("twitchLabel").textContent = chrome.i18n.getMessage("options_twitch");
document.getElementById("twitchTheatreModeLabel").textContent = chrome.i18n.getMessage("options_twitchTheatreMode");

// Controls
const saveBtn = document.getElementById("save");
saveBtn.textContent = chrome.i18n.getMessage("options_save");
saveBtn.onclick=saveOptions;

const restoreDefaultsBtn = document.getElementById("restoreDefaults");
restoreDefaultsBtn.textContent = chrome.i18n.getMessage("options_restoreDefaults");
restoreDefaultsBtn.onclick=restoreDefaultOptions;
document.addEventListener("DOMContentLoaded", restoreOptions);
