/* Global values */
const DEFAULT_HIDE_PROGRESS = true;
const DEFAULT_SEEK_AMOUNT = "10m";
const DEFAULT_TWITCH_THEATRE_MODE = false;

const LOCATION_CHANGE_POLL_INTERVAL = 500 // 500ms
const PLAYER_LOADED_CHECK_INTERVAL = 300; // 300ms
const PLAYER_LOADED_CHECK_TIMEOUT = 15000; // 15s
const PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
const PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";

/* Global variables */
let GLOBAL_firstLoad = true;
let GLOBAL_options = null;
let GLOBAL_onVideoPage = false;
let GLOBAL_progressVisible = null;

/* Functions */
/* INIT */
function init(){
	console.log("OPENEND: Initializing on %s (first load: %s)...", window.location.href, GLOBAL_firstLoad);
	
	determinePage();
	setupPage();
	setupListeners();
	
	GLOBAL_firstLoad = false;
}

function determinePage() {
    GLOBAL_onVideoPage = isVideoPage();
    console.log("OPENEND: On video page: %s", GLOBAL_onVideoPage);
}

function isVideoPage() {
    return new RegExp("twitch.tv/videos/\\d+").test(window.location.href);
}

function setupPage() {
    setupTwitchVideoPage();
    
    let loadingPromises = [];
    if(GLOBAL_firstLoad) {
        loadingPromises.push(readOptions());
    }
    if(GLOBAL_onVideoPage) {
        loadingPromises.push(injectToolbar());
    }
    Promise.all(loadingPromises).then(initAfterOptionsAndToolbarLoaded).catch(handleInitError);
}

function setupTwitchVideoPage() {
    // hide video total times
    const elements = document.getElementsByClassName("card__meta--right");
    for (let j = 0; j < elements.length; j++) {
        elements[j].style.background  = "red";
    }
}

function setupListeners() {
    if(GLOBAL_firstLoad) {
        // Poll the window location to check for location changes without page reloading
        // Sadly, Twitch uses HTML5 pushState which isn't listenable (window.onhashchange is not triggered)
        pollLocationChanges ();
        // Listen for future changes to options
        listenForOptionsChanges();
    }
}

function pollLocationChanges () {
    console.log("OPENEND: Polling for window location changes every %ims", LOCATION_CHANGE_POLL_INTERVAL);
    let oldLocation = location.href;
    setInterval(function() {
         if (location.href != oldLocation) {
             console.log("OPENEND: Window location changed from %s to %s", oldLocation, window.location.href);
             oldLocation = location.href
             init();
         }
     }, LOCATION_CHANGE_POLL_INTERVAL);
}

function readOptions() {
    return new Promise(function(resolve, reject){
        chrome.storage.sync.get({
            hideProgress : DEFAULT_HIDE_PROGRESS,
            seekAmount : DEFAULT_SEEK_AMOUNT,
            twitchTheatreMode : DEFAULT_TWITCH_THEATRE_MODE
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

function injectToolbar() {
    return new Promise(function(resolve, reject) {
        const tryInject = function(playerLoadedCheckStartTime) {
            // "player-seek__time-container"
            const injectionTargetCssClass = "player-seek__time-container";
            // Inject util span into a div
            const injectionContainer = getSingleElementByClassName(injectionTargetCssClass);
            if (injectionContainer){
                const toolbar = buildToolbar();
                injectionContainer.appendChild(toolbar);
                console.log("OPENEND: Open End toolbar available (added in div.%s)", injectionTargetCssClass);
                resolve();
            } else {
                if (PLAYER_LOADED_CHECK_TIMEOUT > Date.now() - playerLoadedCheckStartTime) {
                    console.log("OPENEND: div to add Open End toolbar to is not available yet (div.%s). Checking again in %ims...", injectionTargetCssClass, PLAYER_LOADED_CHECK_INTERVAL)
                    setTimeout(tryInject, PLAYER_LOADED_CHECK_INTERVAL, playerLoadedCheckStartTime);  
                } else {
                    reject(new Error("OPENEND: Open End toolbar not available (failed to find div." + injectionTargetCssClass + " in " + PLAYER_LOADED_CHECK_TIMEOUT + "ms)"));
                }
            }
        };
        tryInject(Date.now());
    });
}

function buildToolbar() {
    // Build toolbar div
    const toolbar = document.createElement("div");
    toolbar.setAttribute("id", "oe-util")

    // Build "Toggle Progress" button
    const toggleProgressBtn = document.createElement("button");
    toggleProgressBtn.setAttribute("id", "oe-toggle-progress");
    toggleProgressBtn.onclick = handleToggleProgressAction;
    // Build "Toggle Progress" img
    const toggleProgressImg = document.createElement("img");
    toggleProgressImg.setAttribute("id", "oe-toggle-progress-img");
    // src and alt will be set via updateToggleProgressState() after options are
    // loaded
    // Add "Toggle Progress" img to "Toggle Progress" button
    toggleProgressBtn.appendChild(toggleProgressImg);
    // Add "Toggle Progress" button to toolbar div
    toolbar.appendChild(toggleProgressBtn);
    
    // Build "Seek Back" button
    const seekBackBtn = document.createElement("button");
    seekBackBtn.setAttribute("id", "oe-seek-back");
    seekBackBtn.textContent = "<";
    seekBackBtn.onclick = handleSeekBackAction;
    // Add "Seek Back" button to toolbar div
    toolbar.appendChild(seekBackBtn);
    
    // Build "Seek Amount" text field
    const seekAmountInput = document.createElement("input");
    seekAmountInput.setAttribute("type", "text");
    seekAmountInput.setAttribute("id", "oe-seek-amount");
    // value will be set via updateSeekAmountValue() after options are loaded
    // Add "Seek Amount" button to toolbar div
    toolbar.appendChild(seekAmountInput);
    
    // Build "Seek Forward" button
    const seekForwardBtn = document.createElement("button");
    seekForwardBtn.setAttribute("id", "oe-seek-forward");
    seekForwardBtn.textContent = ">";
    seekForwardBtn.onclick = handleSeekForwardAction;
    // Add "Seek Forward" button to toolbar div
    toolbar.appendChild(seekForwardBtn);
    
    // Pressing Enter in the "Seek Amount" text field should trigger the "Seek
    // Forward" button
    seekAmountInput.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode == 13) { // 13 = ENTER
            seekForwardBtn.click();
        }
    });
    
    return toolbar;
}

function initAfterOptionsAndToolbarLoaded() {
    console.log("OPENEND: initAfterOptionsAndToolbarLoaded()");
    
    // Initialize global variables with the option values
    GLOBAL_progressVisible = !GLOBAL_options.hideProgress;
    
    if (GLOBAL_onVideoPage) {
        // Update Seek Amount value
        updateSeekAmountValue();
        
        // Set initial Toggle Progress state
        updateToggleProgressState();
        
        // May set theatre mode
        mayEnterTheatreMode();
    }
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

function handleInitError(err) {
    console.error("OPENEND: Failed to initialize: %s", err);
}


/* PROGRESS */
function updateToggleProgressState() {
    console.log("OPENEND: Updating Progress visibility to %s", GLOBAL_progressVisible);
    
    // Make progress indicators visible / hidden
    const toggleClasses = [PROGRESS_TOTAL_TIME_DIV_CLASS, PROGRESS_SLIDER_DIV_CLASS];
    for (let i = 0; i < toggleClasses.length; i++) {
        const toggleClass = toggleClasses[i];
        const elements = document.getElementsByClassName(toggleClass);
        for (let j = 0; j < elements.length; j++) {
            if (GLOBAL_progressVisible) {
                elements[j].style.display = "block";
            }
            else {
                elements[j].style.display = "none";
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

function handleToggleProgressAction() {
    console.log("OPENEND: Handling Toggle Progress action");

    // Toggle
    GLOBAL_progressVisible = !GLOBAL_progressVisible;
    
    updateToggleProgressState();
}


/* SEEKING */
function updateSeekAmountValue() {
    console.log("OPENEND: Updating Seek Amount value to %s", GLOBAL_options.seekAmount);
    document.getElementById("oe-seek-amount").value = GLOBAL_options.seekAmount;
}

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
    // literal RegExp /.../ not working somehow
    const rxDuration = new RegExp("^(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?$");
    const groups = rxDuration.exec(durationString);
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


/* UTIL METHODS */
function getSingleElementByClassName(className) {
	const elems = document.getElementsByClassName(className);
	if (elems.length == 1){
		return elems[0];
	}
	return null;
}


window.onload = init;