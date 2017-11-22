/* Global Constants */
/* Technical Parameters */
const CHECK_PAGE_TASK_INTERVAL = 100; // 200ms
const ELEMENTS_LOADED_TIMEOUT = 30000; // 30s
/* Constants for multi used values */
const PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
const PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";
const THEATRE_MODE_BUTTON_CLASS = "qa-theatre-mode-button";

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
let GLOBAL_videoCardsConfigured = false;
let GLOBAL_videoPlayerConfigured = false;
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
            resetGlobalPageStateFlags();
            configurePage();
            listenForOptionsChanges();
        } else {
            console.error("OPENEND: Failed to load options: %s", chrome.runtime.lastError);
        }
    });
}

function resetGlobalPageFlags() {
    GLOBAL_isVideoPage = false;
    resetGlobalPageStateFlags()
}

function resetGlobalPageStateFlags() {
    GLOBAL_videoCardsConfigured = false;
    GLOBAL_videoPlayerConfigured = false;
    // Initialize global variables with the option values
    GLOBAL_progressVisible = !GLOBAL_options.hideProgress;
}

function configurePage() {
    tryConfigureVideoCards();
    tryConfigureVideoPlayer();
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
function tryConfigureVideoCards() {
    if (!GLOBAL_videoCardsConfigured) {
        const videoStatDivs = document.getElementsByClassName("video-preview-card__preview-overlay-stat");
        if (videoStatDivs.length > 0) {
            console.log("OPENEND: Updating all Video Durations' visibilities to %s", !GLOBAL_options.hideAllVideoDurations);
            for (let i = 0; i < videoStatDivs.length; ++i) {
                const videoStatDiv = videoStatDivs[i];
                const videoLengthDiv = videoStatDiv.querySelector('div[data-test-selector="video-length"]');
                if (videoLengthDiv) {
                    setVisible([videoStatDiv], !GLOBAL_options.hideAllVideoDurations)
                }
            }
            GLOBAL_videoCardsConfigured = true;
            console.log("OPENEND: Configured Video Cards");
        }
    }
}

function tryConfigureVideoPlayer() {
    if (GLOBAL_isVideoPage && !GLOBAL_videoPlayerConfigured) {
        let toolbar = document.getElementById(OPND_TOOLBAR_CLASS);
        if (!toolbar) {
            // Search for injection container for toolbar
            const injectionContainer = getSingleElementByClassName("player-seek__time-container");
            if (injectionContainer) {
                toolbar = buildToolbar();
                injectionContainer.appendChild(toolbar);
                console.log("OPENEND: Injected Open End Toolbar");
            } else {
                console.warn("OPENEND: Could not inject Open End Toolbar because injection container could not be found");
            }
        }

        if(toolbar) {
            // Update Seek Amount value
            configurePlayerSeekAmountValue();

            // Set initial Toggle Progress state
            configurePlayerProgressVisibility();

            // May set theatre mode
            configureTheatreMode();

            GLOBAL_videoPlayerConfigured = true;
            console.log("OPENEND: Configured Twitch Player");
        }
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
        toggleProgressImg.src = chrome.runtime.getURL(GLOBAL_progressVisible ? "imgs/hide_white_16.png" : "imgs/show_white_16.png");
        toggleProgressImg.alt = chrome.i18n.getMessage(GLOBAL_progressVisible ? "toggleProgress_visible" : "toggleProgress_hidden");
    }
}


function configureTheatreMode() {
    const theatreModeButton = getSingleElementByClassName(THEATRE_MODE_BUTTON_CLASS);
    if (theatreModeButton) {
        const isActive = isTheatreModeActive(theatreModeButton);
        if (GLOBAL_options.twitchTheatreMode !== isActive) {
            console.log("OPENEND: Clicking Theatre Mode button to " + (GLOBAL_options.twitchTheatreMode ? "enter" : "exit") + " Theatre Mode");
            theatreModeButton.click();
        }
    }
    else {
        console.warn("OPENEND: Could configure Theatre Mode because the button." + THEATRE_MODE_BUTTON_CLASS + " could not be found");
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
 *
 * @param theatreModeButton {Node} the theatre mode toggle button node (not null)
 * @returns {boolean}
 */
function isTheatreModeActive(theatreModeButton) {
    const innerHtml = theatreModeButton.innerHTML;
    if (innerHtml.indexOf('xlink:href="#icon_theatre_deactivate"') !== -1) {
        return true;
    }
    else if (innerHtml.indexOf('xlink:href="#icon_theatre"') !== -1) {
        return false;
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
            resetGlobalPageStateFlags();
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
            configurePage();
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
    resetGlobalPageFlags();

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
    toggleProgressBtn.classList.add("player-button"); // the Twitch player button CSS class
    toggleProgressBtn.onclick = handleToggleProgressAction;

    // Build "Toggle Progress" button content span
    const toggleProgressContent = document.createElement("span");
    toggleProgressBtn.appendChild(toggleProgressContent);

    // Build "Toggle Progress" Tooltip span: <span class="player-tip" data-tip="Stummschalten"></span>
    const toggleProgressTooltip = document.createElement("span");
    toggleProgressTooltip.classList.add("player-tip");
    toggleProgressTooltip.setAttribute("data-tip", "Toggle progress");
    // Add Tooltip span to "Toggle Progress" button content
    toggleProgressContent.appendChild(toggleProgressTooltip);

    // Build "Toggle Progress" img
    const toggleProgressImg = document.createElement("img");
    toggleProgressImg.setAttribute("id", "opnd-toggle-progress-img");
    // Attributes src and alt will be set via configurePlayerProgressVisibility() after options are loaded.
    // Add "Toggle Progress" img to "Toggle Progress" button content
    toggleProgressContent.appendChild(toggleProgressImg);

    // Add "Toggle Progress" button to toolbar div
    toolbar.appendChild(toggleProgressBtn);

    // Build "Seek Back" button
    const seekBackBtn = document.createElement("button");
    seekBackBtn.setAttribute("id", "opnd-seek-back");
    seekBackBtn.onclick = handleSeekBackAction;
    // Build "Seek Back" img
    const seekBackImg = document.createElement("img");
    seekBackImg.setAttribute("src", chrome.runtime.getURL("imgs/rewind_white_16.png"));
    seekBackImg.setAttribute("alt", "<");
    // Add "Seek Back" img to "Seek Back" button
    seekBackBtn.appendChild(seekBackImg);
    // Add "Seek Back" button to Toolbar div
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
    seekForwardBtn.onclick = handleSeekForwardAction;
    // Build "Seek Forward" img
    const seekForwardImg = document.createElement("img");
    seekForwardImg.setAttribute("src", chrome.runtime.getURL("imgs/fast_forward_white_16.png"));
    seekForwardImg.setAttribute("alt", ">");
    // Add "Seek Forward" img to "Seek Forward" button
    seekForwardBtn.appendChild(seekForwardImg);
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
    const seekAmount = parseDuration(seekAmountInputValue);
    if (seekAmount === 0) {
        console.log("OPENEND: No valid seek amount input value given: %s", seekAmountInputValue);
        return;
    }

    // Add/Subtract the seek amount to/from the current time (but require: minTime < newTime < maxTime)
    const newTime = Math.min(maxTime, Math.max(minTime, currentTime + seekAmount * seekDirectionFactor));

    // Build the new url
    const newTimeUrl = buildCurrentUrlWithTime(newTime);
    console.log("OPENEND: Seeking %is: %is -> %is (%s)", seekAmount, currentTime, newTime, newTimeUrl);
    window.location.assign(newTimeUrl);
}


/* UTIL METHODS */
/**
 *
 * @param time {!number} in seconds
 * @returns {!string} the URL with the time parameter
 */
function buildCurrentUrlWithTime(time) {
    const newTimeFormatted = formatDuration(time);
    const urlParams = newTimeFormatted.length > 0 ? "?t=" + newTimeFormatted : "";
    return window.location.protocol + "//" + window.location.hostname + window.location.pathname + urlParams;
}

/* INIT */
init();
// window.onload = init;
