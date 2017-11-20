/* Global values */
const DEFAULT_HIDE_PROGRESS = true;
const DEFAULT_SEEK_AMOUNT = "2m";
const DEFAULT_HIDE_ALL_VIDEO_DURATIONS = true;
const DEFAULT_TWITCH_THEATRE_MODE = false;

const CHECK_PAGE_TASK_INTERVAL = 200; // 200ms
const ELEMENTS_LOADED_TIMEOUT = 15000; // 15s

const PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
const PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";
const OPND_TOOLBAR_CLASS = "opnd-toolbar";

/* Global variables */
let GLOBAL_options = {
        hideProgress : DEFAULT_HIDE_PROGRESS,
        seekAmount : DEFAULT_SEEK_AMOUNT,
        hideAllVideoDurations : DEFAULT_HIDE_ALL_VIDEO_DURATIONS,
        twitchTheatreMode : DEFAULT_TWITCH_THEATRE_MODE
    };
let GLOBAL_onVideoPage = false;
let GLOBAL_videoCardsLoaded = false;
let GLOBAL_playerLoaded = false;
let GLOBAL_progressVisible = false;

/* Functions */
/* INIT */
function init() {
    console.log("OPENEND: Initializing...");

    loadOptions();
    determinePage();
    startCheckPageTask();
}

function loadOptions() {
    chrome.storage.sync.get({
        hideProgress: DEFAULT_HIDE_PROGRESS,
        seekAmount: DEFAULT_SEEK_AMOUNT,
        hideAllVideoDurations: DEFAULT_HIDE_ALL_VIDEO_DURATIONS,
        twitchTheatreMode: DEFAULT_TWITCH_THEATRE_MODE
    }, function (items) {
        if ("undefined" === typeof chrome.runtime.lastError) {
            GLOBAL_options = items;
            console.log("OPENEND: Loaded options: %O", GLOBAL_options);
            initGlobalsFromOptions();
            configurePage();
            listenForOptionsChanges();
        } else {
            console.error("OPENEND: Failed to load options: %s", chrome.runtime.lastError);
        }
    });
}

function initGlobalsFromOptions() {
    // Initialize global variables with the option values
    GLOBAL_progressVisible = !GLOBAL_options.hideProgress;
}

function configurePage() {
    updateAllVideoDurationsVisibility();

    if (GLOBAL_onVideoPage) {
        configureVideoPlayer(false);
    }
}

function updateAllVideoDurationsVisibility() {
    console.log("OPENEND: Updating All Video Durations visibility to %s", !GLOBAL_options.hideAllVideoDurations);
    setVisible(document.getElementsByClassName("card__meta--right"), !GLOBAL_options.hideAllVideoDurations)
}

function configureVideoPlayer(calledAfterPlayerLoaded) {
    // Update Seek Amount value
    updateSeekAmountValue();

    // Set initial Toggle Progress state
    updatePlayerProgressBarVisibility();

    // May set theatre mode
    if (calledAfterPlayerLoaded) {
        mayEnterTheatreMode();
    }
}

function updateSeekAmountValue() {
    const seekAmountElem = document.getElementById("opnd-seek-amount");
    if (seekAmountElem) {
        console.log("OPENEND: Updating Seek Amount value to %s", GLOBAL_options.seekAmount);
        seekAmountElem.value = GLOBAL_options.seekAmount;
    }
}

function updatePlayerProgressBarVisibility() {
    // Make progress indicators visible / hidden
    const toggleClasses = [PROGRESS_TOTAL_TIME_DIV_CLASS, PROGRESS_SLIDER_DIV_CLASS];
    const allElementsToToggle = [];
    for (let i = 0; i < toggleClasses.length; i++) {
        const classes = document.getElementsByClassName(toggleClasses[i]);
        for (let j = 0; j < classes.length; j++) {
            allElementsToToggle.push(classes[j]);
        }
    }

    if (allElementsToToggle.length > 0) {
        console.log("OPENEND: Updating Progress visibility to %s", GLOBAL_progressVisible);
        setVisible(allElementsToToggle, GLOBAL_progressVisible)
    }

    // Update the toggle img src and alt
    const toggleProgressImg = document.getElementById("opnd-toggle-progress-img");
    if (toggleProgressImg) {
        toggleProgressImg.src = chrome.runtime.getURL(GLOBAL_progressVisible ? "imgs/hide_white_16.png" : "imgs/view_white_16.png");
        toggleProgressImg.alt = chrome.i18n.getMessage(GLOBAL_progressVisible ? "toggleProgress_visible" : "toggleProgress_hidden");
    }
}


function mayEnterTheatreMode() {
    if (GLOBAL_options.twitchTheatreMode === true) {
        const theatreModeBtn = getSingleElementByClassName("js-control-theatre");
        if (theatreModeBtn) {
            console.log("OPENEND: Clicking theatreMode button");
            theatreModeBtn.click();
        } else {
            console.warn("OPENEND: Could not enter theatre mode because the button could not be found");
        }
    }
}

function listenForOptionsChanges() {
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        for (const key in changes) {
            const storageChange = changes[key];
            console.log('Storage key "%s" in namespace "%s" changed. ' + 'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue);
            GLOBAL_options[key] = storageChange.newValue;
            configurePage();
        }
    });
}

function determinePage() {
    GLOBAL_onVideoPage = isVideoPage();
    console.log("OPENEND: On video page: %s", GLOBAL_onVideoPage);
}

function startCheckPageTask() {
    let pageChangedTime = Date.now();
    let oldLocation = createLocationIdentifier(location);

    const constCheckPageTask = function () {

        // Check for location changes
        const newLocation = createLocationIdentifier(location);
        if (newLocation !== oldLocation) {
            console.log("OPENEND: Window location changed from %s to %s", oldLocation, newLocation);
            oldLocation = createLocationIdentifier(location);
            pageChangedTime = Date.now();
            handlePageChange();
        }

        // Check whether elements are loaded
        const checkTime = Date.now();
        if (checkTime - pageChangedTime < ELEMENTS_LOADED_TIMEOUT) {
            if (!GLOBAL_videoCardsLoaded) {
                // hide total times of videos cards
                const videoCards = document.getElementsByClassName("card");
                if (videoCards.length > 0) {
                    console.log("OPENEND: Video cards loaded");
                    GLOBAL_videoCardsLoaded = true;
                    updateAllVideoDurationsVisibility();
                }
            }
            if (GLOBAL_onVideoPage && !GLOBAL_playerLoaded) {
                // Search for injection container for toolbar
                const injectionContainer = getSingleElementByClassName("player-seek__time-container");
                if (injectionContainer) {
                    console.log("OPENEND: Twitch Player loaded");
                    GLOBAL_playerLoaded = true;
                    // Inject toolbar
                    injectionContainer.appendChild(buildToolbar());
                    configureVideoPlayer(true);
                    console.log("OPENEND: Added Open End toolbar to the Twitch player");
                }
            }
        }
    };

    // Execute task now and repeatedly after that
    constCheckPageTask();
    setInterval(constCheckPageTask, CHECK_PAGE_TASK_INTERVAL);
}

function createLocationIdentifier(location) {
    // Don't include the fragment (#) because a changed fragment does not
    // indicate a page change
    // See https://developer.mozilla.org/en-US/docs/Web/API/Location
    return location.pathname + location.search;
}

function handlePageChange() {
    // Reset global page variables
    GLOBAL_onVideoPage = false;
    GLOBAL_videoCardsLoaded = false;
    GLOBAL_playerLoaded = false;
    GLOBAL_progressVisible = false;

    // Remove old toolbar
    const toolbar = document.getElementById(OPND_TOOLBAR_CLASS);
    if (toolbar) {
        toolbar.parentNode.removeChild(toolbar);
    }

    // Determine page
    determinePage();
}

function isVideoPage() {
    return new RegExp("twitch.tv/videos/\\d+").test(window.location.href);
}

function buildToolbar() {
    // Build toolbar div
    const toolbar = document.createElement("div");
    toolbar.setAttribute("id", OPND_TOOLBAR_CLASS);

    // Build "Toggle Progress" button
    const toggleProgressBtn = document.createElement("button");
    toggleProgressBtn.setAttribute("id", "opnd-toggle-progress");
    toggleProgressBtn.onclick = handleToggleProgressAction;
    // Build "Toggle Progress" img
    const toggleProgressImg = document.createElement("img");
    toggleProgressImg.setAttribute("id", "opnd-toggle-progress-img");
    // src and alt will be set via updatePlayerProgressBarVisibility() after
    // options are
    // loaded
    // Add "Toggle Progress" img to "Toggle Progress" button
    toggleProgressBtn.appendChild(toggleProgressImg);
    // Add "Toggle Progress" button to toolbar div
    toolbar.appendChild(toggleProgressBtn);

    // Build "Seek Back" button
    const seekBackBtn = document.createElement("button");
    seekBackBtn.setAttribute("id", "opnd-seek-back");
    seekBackBtn.textContent = "<";
    seekBackBtn.onclick = handleSeekBackAction;
    // Add "Seek Back" button to toolbar div
    toolbar.appendChild(seekBackBtn);

    // Build "Seek Amount" text field
    const seekAmountInput = document.createElement("input");
    seekAmountInput.setAttribute("type", "text");
    seekAmountInput.setAttribute("id", "opnd-seek-amount");
    // value will be set via updateSeekAmountValue() after options are loaded
    // Add "Seek Amount" button to toolbar div
    toolbar.appendChild(seekAmountInput);

    // Build "Seek Forward" button
    const seekForwardBtn = document.createElement("button");
    seekForwardBtn.setAttribute("id", "opnd-seek-forward");
    seekForwardBtn.textContent = ">";
    seekForwardBtn.onclick = handleSeekForwardAction;
    // Add "Seek Forward" button to toolbar div
    toolbar.appendChild(seekForwardBtn);

    // Pressing Enter in the "Seek Amount" text field should trigger the "Seek
    // Forward" button
    seekAmountInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) { // 13 = ENTER
            seekForwardBtn.click();
        }
    });

    return toolbar;
}

/* PROGRESS */
function handleToggleProgressAction() {
    console.log("OPENEND: Handling Toggle Progress action");

    // Toggle
    GLOBAL_progressVisible = !GLOBAL_progressVisible;

    updatePlayerProgressBarVisibility();
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
    const seekAmountInputValue = document.getElementById("opnd-seek-amount").value;
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
    if (elems.length === 1) {
        return elems[0];
    }
    return null;
}

function setVisible(elements, visible) {
    for (let i = 0; i < elements.length; i++) {
        if (visible) {
            elements[i].classList.remove("opnd-hidden");
        } else {
            elements[i].classList.add("opnd-hidden");
        }
    }
}


init();
// window.onload = init;
