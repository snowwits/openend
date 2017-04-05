/* Global values */
const AVAILIBILITY_CHECK_INTERVAL = 200; // 200ms
const AVAILIBILITY_CHECK_TIMEOUT = 30000; // 30s
const PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
const PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";

/* Global variables */
let GLOBAL_options = null;
let GLOBAL_progressVisible = false;

/* Functions */
/* TOGGLE PROGRESS */
function handleToggleProgressAction() {
	console.log("OPENEND: Handling Toggle Progress action");

	// Toggle
	GLOBAL_progressVisible = !GLOBAL_progressVisible;
	
	updateToggleProgressState();
}


function updateToggleProgressState() {
	console.log("OPENEND: Updating progress visibility to %s", GLOBAL_progressVisible);
	
	// Make progress indicators visible / hidden
	const toggleClasses = [PROGRESS_TOTAL_TIME_DIV_CLASS, PROGRESS_SLIDER_DIV_CLASS];
	for (let i = 0; i < toggleClasses.length; i++) {
		const toggleClass = toggleClasses[i];
		const elements = document.getElementsByClassName(toggleClass);
		for (let j = 0; j < elements.length; j++) {
			const element = elements[j];
			if (GLOBAL_progressVisible) {
				element.style.display = "block";
			}
			else {
				element.style.display = "none";
			}
		}
	}	
	
	// Update the img src and alt
	const toggleProgressImg = document.getElementById("oe-toggle-progress-img");
	const toggleProgressImgSrc = GLOBAL_progressVisible ? "imgs/hide_white_16.png" : "imgs/view_white_16.png";
	toggleProgressImg.src = chrome.runtime.getURL(toggleProgressImgSrc);
	const toggleProgressImgAlt = GLOBAL_progressVisible ? "toggleProgress_visible" : "toggleProgress_hidden";
	toggleProgressImg.alt = chrome.i18n.getMessage(toggleProgressImgAlt);
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
	const slider = getSingleElementByClassName(PROGRESS_SLIDER_DIV_CLASS);
	if (!slider) {
		console.error("OPENEND: Seeking failed: div.%s not available", PROGRESS_SLIDER_DIV_CLASS);
	}
	
	// Get min, max, current time in seconds
	const minTime = parseInt(slider.getAttribute("aria-valuemin"));
	const maxTime = parseInt(slider.getAttribute("aria-valuemax"));
	const currentTime = parseInt(slider.getAttribute("aria-valuenow"));
			
	// Get the seek amount in seconds
	const seekDirectionFactor = forward ? 1 : -1;
	const seekAmountInputValue = document.getElementById("oe-seek-amount").value;
	const seekAmount = parseDuration(seekAmountInputValue) * seekDirectionFactor;
	if (seekAmount === 0) {
		console.log("OPENEND: No valid seek amount input value given: %s", seekAmountInputValue);
		return;
	}
	
	// Add the seek amount to the current time (but require: minTime < newTime <
	// maxTime)
	const newTime = Math.min(maxTime, Math.max(minTime, currentTime + seekAmount));
	
	// Build the new url
	const newTimeFormatted = formatDuration(newTime);
	const urlParams = newTimeFormatted.length > 0 ? "?t=" + newTimeFormatted : "";
	const newTimeUrl = window.location.protocol + "//" + window.location.hostname + window.location.pathname + urlParams;
	
	console.log("OPENEND: Seeking %is: %is -> %is (%s)", seekAmount, currentTime, newTime, newTimeFormatted);
	window.location.assign(newTimeUrl);
}

/*
 * "01h02m03s" -> 1 * 60 * 60 + 2 * 60 + 3 = 3723 0 if no match
 */
function parseDuration(durationString) {
    if (durationString.length === 0) {
        return 0;
    }
	const rxDuration = new RegExp("^(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?$");
	const groups = durationString.match(rxDuration);
	if (groups === null) {
	    return 0;
	}
	const hours = parseDurationPart(groups, 1);
	const mins = parseDurationPart(groups, 2);
	const secs = parseDurationPart(groups, 3);
	return secs + mins * 60 + hours * 60 * 60;
}

function parseDurationPart(groups, index) {
	return typeof groups[index] !== "undefined" ? parseInt(groups[index]) : 0;
}

/*
 * 3723 = 1 * 60 * 60 + 2 * 60 + 3 -> "01h02m03s"
 */
function formatDuration(duration) {
	const parts = extractDurationParts(duration);
	let formatted = "";
	if (parts[0] > 0) {
		formatted += padLeft(parts[0]) + "h";
	}
	if (parts[1] > 0) {
		formatted += padLeft(parts[1]) + "m";
	}
	if (parts[2] > 0) {
		formatted += padLeft(parts[2]) + "s";
	}
	return formatted;
}

/*
 * 3723 = 1h, 2m, 3s -> [1, 2, 3]
 */
function extractDurationParts(duration) {
	let amount = duration;
	// Calculate (and subtract) whole hours
	const hours = Math.floor(amount / 3600);
	amount -= hours * 3600;

	// Calculate (and subtract) whole minutes
	const mins = Math.floor(amount / 60);
	amount -= mins * 60;

	// What's left is seconds
	const secs = amount % 60;
	
	return [hours, mins, secs];
}

function padLeft(number, width = 2, padChar = "0") {
	let str = number + "";
	while (str.length < width) {
		str = padChar + str;
	}
	return str;
}


/* INIT */
function init(){
	console.log("OPENEND: Initializing...");
	readOptions().then(injectUtil).catch(handleInitError);
}

function handleInitError(err) {
    console.error("OPENEND: Failed to initialize: %s", err);
}

function readOptions() {
    return new Promise(function(resolve,reject){
        chrome.storage.sync.get({
            seekAmount : "10m",
            twitchTheatreMode : false
        }, function(items) {
            if ("undefined" === typeof chrome.runtime.lastError) {
                GLOBAL_options = items;
                console.log("OPENEND: Read options: %O", GLOBAL_options);
                resolve();
            } else {
                reject(chrome.runtime.lastError);
            }
        });
   });
}

function injectUtil(availibityCheckStartTime = Date.now()) {
	// "player-seek__time-container"
	const injectionTargetCssClass = "player-seek__time-container";
	// Inject util span into a div
	const injectionContainer = getSingleElementByClassName(injectionTargetCssClass);
	if (injectionContainer){
		const utilDiv = buildUtil();
		injectionContainer.appendChild(utilDiv);
		console.log("OPENEND: Open End utility available (added in div.%s)", injectionTargetCssClass);
		
		// Set initial toggle progress state
		updateToggleProgressState();
		
		// May set theatre mode
		mayEnterTheatreMode();
		
		// Listen for changes to options
		listenForOptionsChanges();
	} else {
		if (AVAILIBILITY_CHECK_TIMEOUT > Date.now() - availibityCheckStartTime) {
			console.log("OPENEND: div to add Open End utility to is not available yet (div.%s). Checking again in %ims...", injectionTargetCssClass, AVAILIBILITY_CHECK_INTERVAL)
			setTimeout(injectUtil, AVAILIBILITY_CHECK_INTERVAL, availibityCheckStartTime);	
		} else {
			console.error("OPENEND: Open End utility not available (failed to find div.%s in %ims)", injectionTargetCssClass, AVAILIBILITY_CHECK_TIMEOUT);
		}
	}
}

function buildUtil() {
	// Build util div
	const utilDiv = document.createElement("div");
	utilDiv.setAttribute("id", "oe-util")

	// Build "Toggle Progress" button
	const toggleProgressBtn = document.createElement("button");
	toggleProgressBtn.setAttribute("id", "oe-toggle-progress");
	toggleProgressBtn.onclick = handleToggleProgressAction;
	// Build "Toggle Progress" img
	const toggleProgressImg = document.createElement("img");
	toggleProgressImg.setAttribute("id", "oe-toggle-progress-img");
	// src and alt will be set via updateToggleProgressState()
	// Add "Toggle Progress" img to "Toggle Progress" button
	toggleProgressBtn.appendChild(toggleProgressImg);
	// Add "Toggle Progress" button to util div
	utilDiv.appendChild(toggleProgressBtn);
	
	// Build "Seek Back" button
	const seekBackBtn = document.createElement("button");
	seekBackBtn.setAttribute("id", "oe-seek-back");
	seekBackBtn.textContent = "<";
	seekBackBtn.onclick = handleSeekBackAction;
	// Add "Seek Back" button to util div
	utilDiv.appendChild(seekBackBtn);
	
	// Build "Seek Amount" text field
	const seekAmountInput = document.createElement("input");
	seekAmountInput.setAttribute("type", "text");
	seekAmountInput.setAttribute("id", "oe-seek-amount");
	seekAmountInput.value = GLOBAL_options.seekAmount;
	// Add "Seek Amount" button to util div
	utilDiv.appendChild(seekAmountInput);
	
	// Build "Seek Forward" button
	const seekForwardBtn = document.createElement("button");
	seekForwardBtn.setAttribute("id", "oe-seek-forward");
	seekForwardBtn.textContent = ">";
	seekForwardBtn.onclick = handleSeekForwardAction;
	// Add "Seek Forward" button to util div
	utilDiv.appendChild(seekForwardBtn);
	
	// Pressing Enter in the "Seek Amount" text field should trigger the "Seek
    // Forward" button
	seekAmountInput.addEventListener("keyup", function(event) {
		event.preventDefault();
		if (event.keyCode == 13) { // 13 = ENTER
			seekForwardBtn.click();
		}
	});
	
	return utilDiv;
}

function mayEnterTheatreMode() {
	if (GLOBAL_options.twitchTheatreMode === true) {
		const theatreModeBtn = getSingleElementByClassName("js-control-theatre");
		if(theatreModeBtn) {
			theatreModeBtn.click();
		} else {
			console.warn("OPENEND: Could not enter theatre mode because the button could not be found");
		}
	}
}

function listenForOptionsChanges() {
	chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (const key in changes) {
          const storageChange = changes[key];
          console.log('Storage key "%s" in namespace "%s" changed. ' + 'Old value was "%s", new value is "%s".',
                      key,
                      namespace,
                      storageChange.oldValue,
                      storageChange.newValue);
        }
      });
}

function getSingleElementByClassName(className) {
	const elems = document.getElementsByClassName(className);
	if (elems.length == 1){
		return elems[0];
	}
	return null;
}

window.onload = init;