var AVAILIBILITY_CHECK_INTERVAL = 200;
var AVAILIBILITY_CHECK_TIMEOUT = 30000;
var DEFAULT_SEEK_AMOUNT = 10.0;
var PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
var PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";

var progressVisible = false;
var initStartTime = null;

function handleToggleProgressAction() {
	console.log("OPENEND: Handling Toggle Progress action");

	// Toggle 
	progressVisible = !progressVisible;
	
	updateProgressVisibility();
}

/* TOGGLE PROGRESS */
function updateProgressVisibility() {
	// Make progress indicators visible / invisible
	var toggleClasses = [PROGRESS_TOTAL_TIME_DIV_CLASS, PROGRESS_SLIDER_DIV_CLASS];
	for (i = 0; i < toggleClasses.length; i++) {
		var toggleClass = toggleClasses[i];
		var elements = document.getElementsByClassName(toggleClass);
		for(j = 0; j < elements.length; j++) {
			var element = elements[j];
			if(progressVisible) {
				element.style.display = "block";
			}
			else {
				element.style.display = "none";
			}
		}
	}	
	
	// Update the button label
	var oe_toggleProgressBtn = document.getElementById("oe-toggle-progress");
	var oe_toggleProgressBtnLabelMsg = progressVisible ? "toggleProgress_visible" : "toggleProgress_hidden";
	oe_toggleProgressBtn.innerHTML = chrome.i18n.getMessage(oe_toggleProgressBtnLabelMsg);
}

/* SEEKING */
function handleSeekBackAction() {
	console.log("OPENEND: Handling Seek Back action");
	seek(false);
}

function handleSeekForwardAction() {
	console.log("OPENEND: Handling Seek Forward action");
	seek(true);
}

function seek(forward = true) {
	var sliders = document.getElementsByClassName(PROGRESS_SLIDER_DIV_CLASS);
	if (sliders.length == 1) {
		var slider = sliders[0];
		
		// Get min, max, current time in seconds
		var minTime = parseInt(slider.getAttribute("aria-valuemin"));
		var maxTime = parseInt(slider.getAttribute("aria-valuemax"));
		var currentTime = parseInt(slider.getAttribute("aria-valuenow"));
				
		// Get the seek amount in seconds
		var directionMultiplier = forward ? 1 : -1;
		var seekAmountInput = document.getElementById("oe-seek-amount");
		var seekAmount = parseDuration(seekAmountInput.value) * directionMultiplier;
		
		// Add the seek amount to the current time (but require: minTime < newTime < maxTime)
		var newTime = Math.min(maxTime, Math.max(minTime, currentTime + seekAmount));
		
		// Build the new url
		var newTimeFormatted = formatDuration(newTime);
		var urlParams = newTimeFormatted.length > 0 ? "?t=" + newTimeFormatted : "";
		var newTimeUrl = window.location.protocol + "//" + window.location.hostname + window.location.pathname + urlParams;
		
		console.log("OPENEND: Seeking %is: %is -> %is (%s)", seekAmount, currentTime, newTime, newTimeFormatted);
		window.location.assign(newTimeUrl);
	}
}

/*
	"01h02m03s" -> 1 * 60 * 60 + 2 * 60 + 3 = 3723
*/
function parseDuration(durationString) {
	var rxTime = new RegExp("(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?");
	var groups = durationString.match(rxTime);
	var hours = parseDurationPart(groups, 1);
	var mins = parseDurationPart(groups, 2);
	var secs = parseDurationPart(groups, 3);
	return secs + mins * 60 + hours * 60 * 60;
}

function parseDurationPart(groups, index) {
	return typeof groups[index] !== "undefined" ? parseInt(groups[index]) : 0;
}

/*
	3723 = 1 * 60 * 60 + 2 * 60 + 3 -> "01h02m03s"
*/
function formatDuration(duration) {
	var parts = extractDurationParts(duration);
	var formatted = "";
	if (parts[0] > 0) {
		formatted += pad(parts[0]) + "h";
	}
	if (parts[1] > 0) {
		formatted += pad(parts[1]) + "m";
	}
	if (parts[2] > 0) {
		formatted += pad(parts[2]) + "s";
	}
	return formatted;
}

/*
	3723 = 1h, 2m, 3s -> [1, 2, 3]
*/
function extractDurationParts(duration) {
	var amount = duration;
	// calculate (and subtract) whole hours
	var hours = Math.floor(amount / 3600);
	amount -= hours * 3600;

	// calculate (and subtract) whole minutes
	var mins = Math.floor(amount / 60);
	amount -= mins * 60;

	// what's left is seconds
	var secs = amount % 60;
	
	return [hours, mins, secs];
}

function pad(number, width = 2, padChar = '0') {
    var padding = new Array(1 + width).join(padChar);
    return (padding + number).slice(-padding.length);
}


/* INIT */
function init(){
	console.log("OPENEND: Initializing...");
	initStartTime = Date.now();
	
	injectUtilSpan();
}

function injectUtilSpan() {
	// Inject util span into player seek time container
	var playerSeekTimeContainers = document.getElementsByClassName("player-seek__time-container");
	if (playerSeekTimeContainers.length == 1){
		var playerSeekTimeContainer = playerSeekTimeContainers[0];
		console.log("OPENEND: div.player-seek__time-container available: %s", playerSeekTimeContainer);
		oe_utilSpan = buildUtilSpan();
		playerSeekTimeContainer.appendChild(oe_utilSpan);
		
		// Set initial visibility
		updateProgressVisibility();
	} else {
		if (AVAILIBILITY_CHECK_TIMEOUT > Date.now() - initStartTime) {
			console.log("OPENEND: div.player-seek__time-container not available yet. Checking again in %ims...", AVAILIBILITY_CHECK_INTERVAL)
			setTimeout(injectUtilSpan, AVAILIBILITY_CHECK_INTERVAL);	
		} else {
			console.error("OPENEND: Check timeout of %ims reached. Could not add Open End utility to the Twitch page.", AVAILIBILITY_CHECK_TIMEOUT);
		}
	}
}

function buildUtilSpan() {
	// Build util span
	var oe_utilSpan = document.createElement("span");
	oe_utilSpan.setAttribute("id", "oe-util")

	// Build Open End icon img
	var oe_iconImg = document.createElement("img");
	var oe_iconImgUrl = chrome.extension.getURL("icon_16.png");
	oe_iconImg.setAttribute("src", oe_iconImgUrl);
	// Add "Open End icon" img to util span
	oe_utilSpan.appendChild(oe_iconImg);
	
	// Build "Toggle Progress" button
	var oe_toggleProgressBtn = document.createElement("button");
	oe_toggleProgressBtn.setAttribute("id", "oe-toggle-progress");
	// innerHTML will be set via updateProgressVisibility()
	oe_toggleProgressBtn.onclick = handleToggleProgressAction;
	// Add "Toggle Open End" button to util span
	oe_utilSpan.appendChild(oe_toggleProgressBtn);
	
	// Build "Seek Back" button
	var oe_seekBackBtn = document.createElement("button");
	oe_seekBackBtn.setAttribute("id", "oe-seek-back");
	oe_seekBackBtn.innerHTML = "<";
	oe_seekBackBtn.onclick = handleSeekBackAction;
	// Add "Seek Back" button to util span
	oe_utilSpan.appendChild(oe_seekBackBtn);
	
	// Build "Seek Amount" text field
	var oe_seekAmountInput = document.createElement("input");
	oe_seekAmountInput.setAttribute("type", "text");
	oe_seekAmountInput.setAttribute("id", "oe-seek-amount");
	oe_seekAmountInput.value = "10m";
	// Add "Seek Amount" button to util span
	oe_utilSpan.appendChild(oe_seekAmountInput);
	
	// Build "Seek Forward" button
	var oe_seekForwardBtn = document.createElement("button");
	oe_seekForwardBtn.setAttribute("id", "oe-seek-forward");
	oe_seekForwardBtn.innerHTML = ">";
	oe_seekForwardBtn.onclick = handleSeekForwardAction;
	// Add "Seek Forward" button to util span
	oe_utilSpan.appendChild(oe_seekForwardBtn);
	
	return oe_utilSpan;
}


window.onload = init;