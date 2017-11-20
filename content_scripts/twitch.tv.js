/* Global Constants */
/* Option Defaults */
const OPT_HIDE_PROGRESS_DEFAULT = true;
const OPT_SEEK_AMOUNT_DEFAULT = "2m";
const OPT_HIDE_ALL_VIDEO_DURATIONS_DEFAULT = true;
const OPT_TWITCH_THEATRE_MODE_DEFAULT = false;
/* Technical Parameters */
const CHECK_PAGE_TASK_INTERVAL = 200; // 200ms
const ELEMENTS_LOADED_TIMEOUT = 15000; // 15s
/* Constants for multi used values */
const PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
const PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";
const THEATRE_MODE_BUTTON_CLASS = "qa-theatre-mode-button";
const OPND_TOOLBAR_CLASS = "opnd-toolbar";
/**
 * The CSS class of Open End container div elements. To not interfere with the page CSS style, we wrap every element we want to hide in a custom container div and then hide that container.
 * @type {string}
 */
const OPND_CONTAINER_CLASS = "opnd-container";
/**
 * The CSS class that is added to Open End containers to hide them and thus their content.
 * @type {string}
 */
const OPND_HIDDEN_CLASS = "opnd-hidden";

/* Global Variables */
/* Global Cached Options */
let GLOBAL_options = {
    hideProgress: OPT_HIDE_PROGRESS_DEFAULT,
    seekAmount: OPT_SEEK_AMOUNT_DEFAULT,
    hideAllVideoDurations: OPT_HIDE_ALL_VIDEO_DURATIONS_DEFAULT,
    twitchTheatreMode: OPT_TWITCH_THEATRE_MODE_DEFAULT
};
/* Global Page Type Flags */
let GLOBAL_isVideoPage = false;
/* Global Page Component Loaded Flags */
let GLOBAL_videoCardsLoaded = false;
let GLOBAL_playerLoaded = false;
/* Global Page Component State Flags */
let GLOBAL_progressVisible = !OPT_HIDE_PROGRESS_DEFAULT;

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
        hideProgress: OPT_HIDE_PROGRESS_DEFAULT,
        seekAmount: OPT_SEEK_AMOUNT_DEFAULT,
        hideAllVideoDurations: OPT_HIDE_ALL_VIDEO_DURATIONS_DEFAULT,
        twitchTheatreMode: OPT_TWITCH_THEATRE_MODE_DEFAULT
    }, function (items) {
        if ("undefined" === typeof chrome.runtime.lastError) {
            GLOBAL_options = items;
            console.log("OPENEND: Loaded options: %O", GLOBAL_options);
            updateGlobalFlagsFromGlobalOptions();
            configurePage();
            listenForOptionsChanges();
        } else {
            console.error("OPENEND: Failed to load options: %s", chrome.runtime.lastError);
        }
    });
}

function resetGlobalFlags() {
    GLOBAL_isVideoPage = false;
    GLOBAL_videoCardsLoaded = false;
    GLOBAL_playerLoaded = false;
    updateGlobalFlagsFromGlobalOptions()
}

function updateGlobalFlagsFromGlobalOptions() {
    // Initialize global variables with the option values
    GLOBAL_progressVisible = !GLOBAL_options.hideProgress;
}

function configurePage() {
    configureVideoCards();

    if (GLOBAL_isVideoPage) {
        configureVideoPlayer(false);
    }
}

/**
 * On Video page:
 *
 * Video card:
 * <div class="tw-card relative"> ... </div>
 *
 * Video stat (length):
 * <div class="video-preview-card__preview-overlay-stat c-background-overlay c-text-overlay font-size-6 top-0 right-0 z-default inline-flex absolute mg-05">
 *      <div class="tw-tooltip-wrapper inline-flex">
 *          <div class="tw-stat" data-test-selector="video-length">
 *              <span class="tw-stat__icon"><figure class="svg-figure"><svg ...> ... </svg></figure></span>
 *              <span class="tw-stat__value" data-a-target="tw-stat-value">4:33:57</span>
 *          </div>
 *          <div class="tw-tooltip tw-tooltip--down tw-tooltip--align-center" data-a-target="tw-tooltip-label">Länge</div>
 *      </div>
 * </div>
 *
 */
function configureVideoCards() {
    const videoCards = document.getElementsByClassName("tw-card");
    if (videoCards.length > 0) {
        console.log("OPENEND: Video cards loaded (maybe without contents yet)");

        const videoStatDivs = document.getElementsByClassName("video-preview-card__preview-overlay-stat");
        if (videoStatDivs.length > 0) {
            console.log("OPENEND: Video cards contents loaded");
            GLOBAL_videoCardsLoaded = true;
            console.log("OPENEND: Updating All Video Durations visibility to %s", !GLOBAL_options.hideAllVideoDurations);
            for (let i = 0; i < videoStatDivs.length; ++i) {
                const videoStatDiv = videoStatDivs[i];
                const videoLengthDiv = videoStatDiv.querySelector('div[data-test-selector="video-length"]');
                if (videoLengthDiv) {
                    setVisible([videoStatDiv], !GLOBAL_options.hideAllVideoDurations)
                }
            }
        }
    }
}

function configureVideoPlayer(calledAfterPlayerLoaded) {
    // Update Seek Amount value
    configurePlayerSeekAmountValue();

    // Set initial Toggle Progress state
    configurePlayerProgressVisibility();

    // May set theatre mode
    if (calledAfterPlayerLoaded) {
        configureTheatreMode();
    }
}

function configurePlayerSeekAmountValue() {
    const seekAmountElem = document.getElementById("opnd-seek-amount");
    if (seekAmountElem) {
        console.log("OPENEND: Updating Seek Amount value to %s", GLOBAL_options.seekAmount);
        seekAmountElem.value = GLOBAL_options.seekAmount;
    }
}

function configurePlayerProgressVisibility() {
    // Make progress indicators visible / hidden
    const allElementsToToggle = getElementsByClassNames([PROGRESS_TOTAL_TIME_DIV_CLASS, PROGRESS_SLIDER_DIV_CLASS]);

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


function configureTheatreMode() {
    const isActive = isTheatreModeActive();
    if (GLOBAL_options.twitchTheatreMode !== isActive) {
        const theatreModeBtn = getSingleElementByClassName(THEATRE_MODE_BUTTON_CLASS);
        if (theatreModeBtn) {
            console.log("OPENEND: Clicking Theatre Mode button to " + (GLOBAL_options.twitchTheatreMode ? "enter" : "exit") + " Theatre Mode");
            theatreModeBtn.click();
        } else {
            console.warn("OPENEND: Could configure Theatre Mode because the button." + THEATRE_MODE_BUTTON_CLASS + " could not be found");
        }
    }
}

/**
 * "Exit Theatre Mode" button:
 * <button class="player-button qa-theatre-mode-button" id="" tabindex="-1" type="button">
 *     <span><span class="player-tip" data-tip="Kino-Modus beenden"></span><span class="">
 *         <svg class=""><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon_theatre_deactivate"></use></svg>
 *     </span></span>
 * </button>
 *
 * "Enter Theatre Mode" button:
 * <button class="player-button qa-theatre-mode-button" id="" tabindex="-1" type="button">
 *      <span><span class="player-tip" data-tip="Kino-Modus"></span><span class="">
 *          <svg class=""><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon_theatre"></use></svg>
 *      </span></span>
 * </button>
 */
function isTheatreModeActive() {
    const theatreModeButton = getSingleElementByClassName(THEATRE_MODE_BUTTON_CLASS);
    if (theatreModeButton) {
        const innerHtml = theatreModeButton.innerHTML;
        if (innerHtml.indexOf('xlink:href="#icon_theatre_deactivate"') !== -1) {
            return true;
        }
        else if (innerHtml.indexOf('xlink:href="#icon_theatre"') !== -1) {
            return false;
        }
    }
    console.warn("Could not determine if Theatre Mode is active");
    return false;
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
    GLOBAL_isVideoPage = isVideoPage();
    console.log("OPENEND: On video page: %s", GLOBAL_isVideoPage);
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
                configureVideoCards();
            }
            if (GLOBAL_isVideoPage && !GLOBAL_playerLoaded) {
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
    resetGlobalFlags();

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
    // src and alt will be set via configurePlayerProgressVisibility() after
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
    // value will be set via configurePlayerSeekAmountValue() after options are loaded
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

    configurePlayerProgressVisibility();
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
    const newTimeUrl = buildCurrentUrlWithTime(newTime);
    console.log("OPENEND: Seeking %is: %is -> %is (%s)", seekAmount, currentTime, newTime, newTimeUrl);
    window.location.assign(newTimeUrl);
}


/* UTIL METHODS */
/**
 *
 * @param time {Number} in seconds
 * @returns {string} the URL with the time parameter
 */
function buildCurrentUrlWithTime(time) {
    const newTimeFormatted = formatDuration(time);
    const urlParams = newTimeFormatted.length > 0 ? "?t=" + newTimeFormatted : "";
    return window.location.protocol + "//" + window.location.hostname + window.location.pathname + urlParams;
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

/**
 *
 * @param classNames {Array.<string>} the class names
 * @returns {Array} all elements that have any of the specified class names
 */
function getElementsByClassNames(classNames) {
    const allElements = [];
    for (let i = 0; i < classNames.length; i++) {
        const classes = document.getElementsByClassName(classNames[i]);
        for (let j = 0; j < classes.length; j++) {
            allElements.push(classes[j]);
        }
    }
    return allElements
}


function getSingleElementByClassName(className) {
    const elems = document.getElementsByClassName(className);
    if (elems.length === 1) {
        return elems[0];
    }
    return null;
}

function setVisible(elements, visible) {
    for (let i = 0; i < elements.length; i++) {
        const opndContainer = getOrWrapInOpenEndContainer(elements[i]);
        if (visible) {
            opndContainer.classList.remove(OPND_HIDDEN_CLASS);
        } else {
            opndContainer.classList.add(OPND_HIDDEN_CLASS);
        }
    }
}

function getOrWrapInOpenEndContainer(element) {
    const container = getOpenEndContainer(element);
    if(container){
        return container;
    }
    return wrapInOpenEndContainer(element);
}

function getOpenEndContainer(element) {
    const parent = element.parentNode;
    if(parent.classList.contains(OPND_CONTAINER_CLASS)){
        return parent;
    }
    return null;
}

function wrap(element, wrapper) {
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
}

function wrapInOpenEndContainer(element) {
    return wrap(element, createOpenEndContainer())
}

function createOpenEndContainer() {
    const opndContainer = document.createElement('div');
    opndContainer.classList.add(OPND_CONTAINER_CLASS);
    return opndContainer;
}

init();
// window.onload = init;
