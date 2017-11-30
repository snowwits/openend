/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function log(msg, ...substitutions) {
    logWithComponent("content_script-twitch", msg, ...substitutions);
}

function warn(msg, ...substitutions) {
    warnWithComponent("content_script-twitch", msg, ...substitutions);
}

function error(msg, ...substitutions) {
    errorWithComponent("content_script-twitch", msg, ...substitutions);
}


/*
 * ====================================================================================================
 * CONSTANTS
 * ====================================================================================================
 */
/* Global Constants */
/* Technical Parameters */
const CHECK_PAGE_TASK_INTERVAL = 200; // 200ms
const PAGE_CONFIGURATION_TIMEOUT = 30000; // 30s

/* Constants element IDs and classes */
const TWITCH_PROGRESS_TOTAL_TIME_DIV_CLASS = "player-seek__time--total";
const TWITCH_PROGRESS_SLIDER_DIV_CLASS = "js-player-slider";
const TWITCH_THEATRE_MODE_BTN_CLASS = "qa-theatre-mode-button";
/**
 *  The Twitch player button CSS class.
 * @type {string}
 */
const TWITCH_PLAYER_BTN_CLASS = "player-button";
/**
 *  Tooltip span: <span class="player-tip" data-tip="Mute"></span>
 * @type {string}
 */
const TWITCH_PLAYER_TOOLTIP_SPAN_CLASS = "player-tip";
const TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR = "data-tip";

/* Global Variables */
/* Global Cached Options */
let GLOBAL_options = getDefaultOptionsCopy();

let GLOBAL_pageType = null;
/* Global Page Component Loaded Flags */
/**
 *
 * @type {?Channel}
 */
let GLOBAL_channel = null;
let GLOBAL_sfmPlayerConfigured = false;
let GLOBAL_sfmVideoListItemsConfigured = false;
let GLOBAL_pageConfigurationTimeoutReached = false;
let GLOBAL_theatreModeConfigured = false;
/* Global Page Component State Flags */
let GLOBAL_playerDurationVisible = !OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT;


/*
 * ====================================================================================================
 * UTIL FUNCTIONS
 * ====================================================================================================
 */
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


/*
 * ====================================================================================================
 * FUNCTIONS
 * ====================================================================================================
 */

function loadOptions() {
    chrome.storage.sync.get(getDefaultOptionsCopy(), function (items) {
        if (chrome.runtime.lastError) {
            error("Failed to load options: %s", chrome.runtime.lastError);
            return;
        }
        GLOBAL_options = items;
        log("Loaded options: %O", GLOBAL_options);
        resetGlobalPageStateFlags();
        configurePage();
        listenForOptionsChanges();
    });
}

function resetGlobalPageFlags() {
    GLOBAL_pageType = null;
    updateChannel(null);
    resetGlobalPageStateFlags()
}

function resetGlobalPageStateFlags() {
    GLOBAL_sfmPlayerConfigured = false;
    GLOBAL_sfmVideoListItemsConfigured = false;
    GLOBAL_pageConfigurationTimeoutReached = false;
    GLOBAL_theatreModeConfigured = false;
    // Initialize global variables with the option values
    GLOBAL_playerDurationVisible = !GLOBAL_options[OPT_SFM_PLAYER_HIDE_DURATION_NAME];
}

function listenForMessages() {
    chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 *
 * @param request {!Message} the message
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(request, sender, sendResponse) {
    log("Received message from [%o]: %o", sender, request);
    if (MSG_TYPE_NAME in request) {
        if (MSG_TYPE_TAB_INFO_REQUEST === request[MSG_TYPE_NAME]) {
            const tabInfoMessage = buildTabInfoMessage();
            log("Responding to [Message:" + MSG_TYPE_TAB_INFO_REQUEST + "] with: %o", tabInfoMessage);
            sendResponse(tabInfoMessage);
        }
    }
}

/**
 *
 * @param channel {?Channel}
 */
function updateChannel(channel) {
    GLOBAL_channel = channel;
    log("Updated channel to %o", GLOBAL_channel);

    // Notify about TabInfo change
    const tabInfoMessage = buildTabInfoMessage();
    chrome.runtime.sendMessage(tabInfoMessage, function (response) {
        log("Message [%o] was successfully sent", tabInfoMessage);
    });
}

/**
 * @return TabInfoMessage
 */
function buildTabInfoMessage() {
    const channelQualifiedName = GLOBAL_channel !== null ? GLOBAL_channel.qualifiedName : TAB_INFO_CURRENT_CHANNEL_DEFAULT;
    return {
        [MSG_TYPE_NAME]: MSG_TYPE_TAB_INFO,
        [MSG_BODY_NAME]: {
            [TAB_INFO_CURRENT_CHANNEL_NAME]: channelQualifiedName
        }
    };
}

function isPageConfigurationDone() {
    return GLOBAL_channel !== null && GLOBAL_sfmPlayerConfigured && GLOBAL_sfmVideoListItemsConfigured && GLOBAL_theatreModeConfigured;
}

function configurePage() {
    determineChannel();
    configureSfmPlayer();
    configureSfmVideoListItems();
    configureTheatreMode();
}

function configureSfmPlayer() {
    if (GLOBAL_pageType === TwitchPageType.VIDEO && !GLOBAL_sfmPlayerConfigured) {
        let toolbar = document.getElementById(OPND_PLAYER_TOOLBAR_ID);
        if (!toolbar) {
            // Search for injection container for toolbar (the left button panel)
            const injectionContainer = getSingleElementByClassName("player-buttons-left");
            if (injectionContainer) {
                toolbar = buildPlayerToolbar();
                injectionContainer.appendChild(toolbar);
                log("Injected Open End Toolbar");
            } else {
                warn("Could not inject Open End Toolbar because injection container could not be found");
            }
        }

        if (toolbar) {
            // Update Jump Distance value
            configurePlayerJumpDistanceValue();

            //
            configurePlayerJumpButtons();

            // Set initial Show/Hide Duration state
            configurePlayerDurationVisible();

            GLOBAL_sfmPlayerConfigured = true;
            log("Configured Twitch Player");
        }
    }
}

function configurePlayerJumpDistanceValue() {
    const jumpDistanceElem = document.getElementById(OPND_PLAYER_JUMP_DISTANCE_INPUT_ID);
    if (jumpDistanceElem) {
        jumpDistanceElem.value = GLOBAL_options[OPT_SFM_PLAYER_JUMP_DISTANCE_NAME];
        log("Updated Player Jump Distance value to %s", GLOBAL_options[OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]);
    }
}

function configurePlayerJumpButtons() {
    handleJumpDistanceInputValueChange();
}

function configurePlayerDurationVisible() {
    // Make progress indicators visible / hidden
    const allElementsToToggle = getElementsByClassNames([TWITCH_PROGRESS_TOTAL_TIME_DIV_CLASS, TWITCH_PROGRESS_SLIDER_DIV_CLASS]);

    if (allElementsToToggle.length > 0) {
        log("Updating visibility of Player Duration to %s", GLOBAL_playerDurationVisible);
        setVisible(allElementsToToggle, GLOBAL_playerDurationVisible)
    }

    // Update the Player Progress Visibility img src and alt
    const tooltip = chrome.i18n.getMessage(GLOBAL_playerDurationVisible ? "playerShowHideDuration_visible" : "playerShowHideDuration_hidden");
    const showHidePlayerDurationImg = document.getElementById(OPND_PLAYER_SHOW_HIDE_DURATION_IMG_ID);
    if (showHidePlayerDurationImg) {
        showHidePlayerDurationImg.src = chrome.runtime.getURL(GLOBAL_playerDurationVisible ? "imgs/hide_white.svg" : "imgs/show_white.svg");
        showHidePlayerDurationImg.alt = tooltip
    }

    const showHidePlayerDurationTooltipSpan = document.getElementById(OPND_PLAYER_SHOW_HIDE_DURATION_TOOLTIP_SPAN_ID);
    if (showHidePlayerDurationTooltipSpan) {
        showHidePlayerDurationTooltipSpan.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, tooltip);
    }
}

function configureTheatreMode() {
    if (GLOBAL_pageType === TwitchPageType.VIDEO && !GLOBAL_theatreModeConfigured) {
        const theatreModeBtn = getSingleElementByClassName(TWITCH_THEATRE_MODE_BTN_CLASS);
        if (theatreModeBtn) {
            const isActive = isTheatreModeActive(theatreModeBtn);
            if (GLOBAL_options[OPT_GENERAL_THEATRE_MODE_NAME] !== isActive) {
                log("" + (GLOBAL_options[OPT_GENERAL_THEATRE_MODE_NAME] ? "Entering" : "Exiting") + " Player Theatre Mode");
                theatreModeBtn.click();
            }
            GLOBAL_theatreModeConfigured = true;
        }
        else {
            warn("Could not configure Player Theatre Mode because the button." + TWITCH_THEATRE_MODE_BTN_CLASS + " could not be found");
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
    warn("Could not determine if Theatre Mode is active");
    return false;
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
function configureSfmVideoListItems() {
    if (!GLOBAL_sfmVideoListItemsConfigured) {
        const videoStatDivs = document.getElementsByClassName("video-preview-card__preview-overlay-stat");
        if (videoStatDivs.length > 0) {
            log("Updating visibility of all Video List item durations to %s", !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]);
            for (let i = 0; i < videoStatDivs.length; ++i) {
                const videoStatDiv = videoStatDivs[i];
                const videoLengthDiv = videoStatDiv.querySelector('div[data-test-selector="video-length"]');
                if (videoLengthDiv) {
                    setVisible([videoStatDiv], !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME])
                }
            }
            GLOBAL_sfmVideoListItemsConfigured = true;
            log("Configured Video List items");
        }
    }
}

function listenForOptionsChanges() {
    chrome.storage.onChanged.addListener(handleStorageChanges);
}

function handleStorageChanges(changes, namespace) {
    log("[%s storage] Changes: %o", namespace, changes);
    for (const key in changes) {
        GLOBAL_options[key] = changes[key].newValue;
    }
    resetGlobalPageStateFlags();
    configurePage();
}

function determinePageType() {
    const pageTypeResult = TWITCH_PLATFORM.determinePage(window.location.hostname, window.location.pathname, window.location.search);
    if (pageTypeResult) {
        GLOBAL_pageType = pageTypeResult.pageType;
        if (pageTypeResult.channel) {
            updateChannel(pageTypeResult.channel);
        }
    }
    log("Page type: %s", GLOBAL_pageType);
}


function startCheckPageTask() {
    let pageChangedTime = Date.now();
    let oldLocation = createLocationIdentifier(location);

    const constCheckPageTask = function () {
        // Check for location changes
        const newLocation = createLocationIdentifier(location);
        if (newLocation !== oldLocation) {
            log("Window location changed from %s to %s", oldLocation, newLocation);
            oldLocation = createLocationIdentifier(location);
            pageChangedTime = Date.now();
            handlePageChange();
        }

        // Check whether elements are loaded
        if (!isPageConfigurationDone() && !GLOBAL_pageConfigurationTimeoutReached) {
            const checkTime = Date.now();
            if (checkTime - pageChangedTime < PAGE_CONFIGURATION_TIMEOUT) {
                configurePage();
            }
            else {
                GLOBAL_pageConfigurationTimeoutReached = true;
                warn("Page configuration timeout reached (%d ms)", PAGE_CONFIGURATION_TIMEOUT);
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
    return location.hostname + location.pathname + location.search;
}

function handlePageChange() {
    resetGlobalPageFlags();

    // Remove old toolbar
    const toolbar = document.getElementById(OPND_PLAYER_TOOLBAR_ID);
    if (toolbar) {
        toolbar.parentNode.removeChild(toolbar);
    }

    // Determine page
    determinePageType();
}

/**
 * <a data-target="channel-header__channel-link" data-a-target="user-channel-header-item" class="channel-header__user align-items-center flex flex-shrink-0 flex-nowrap pd-r-2 pd-y-05" href="/mdz_jimmy">
 * ...
 * </a>
 */
function determineChannel() {
    if (GLOBAL_channel === null) {
        const channelLinkAnchor = document.querySelector("a[data-target=channel-header__channel-link]");
        if (channelLinkAnchor) {
            const pageTypResult = TWITCH_PLATFORM.determinePage(channelLinkAnchor.hostname, channelLinkAnchor.pathname, channelLinkAnchor.search);
            if (pageTypResult && pageTypResult.channel) {
                updateChannel(pageTypResult.channel);
            }
            else {
                warn("Failed to parse channel from hostname=%s and pathname=%s", channelLinkAnchor.hostname, channelLinkAnchor.pathname);
            }
        }
    }
}

function buildPlayerToolbar() {
    // Build toolbar div
    const toolbar = document.createElement("div");
    toolbar.setAttribute("id", OPND_PLAYER_TOOLBAR_ID);

    // Build "Progress Visibility" button
    const progressVisibilityBtn = buildPlayerToolbarButton(OPND_PLAYER_SHOW_HIDE_DURATION_BTN_ID, handlePlayerShowHideDurationAction, OPND_PLAYER_SHOW_HIDE_DURATION_TOOLTIP_SPAN_ID, null, OPND_PLAYER_SHOW_HIDE_DURATION_IMG_ID);
    toolbar.appendChild(progressVisibilityBtn);

    // Build "Jump Back" button
    const jumpBackwardBtn = buildPlayerToolbarButton(OPND_PLAYER_JUMP_BACKWARD_BTN_ID, handlePlayerJumpBackwardAction, OPND_PLAYER_JUMP_BACKWARD_TOOLTIP_SPAN_ID, "playerJumpBackward", null, "imgs/jump_backward_white.svg");
    toolbar.appendChild(jumpBackwardBtn);

    // Build "Jump Distance" text input
    const jumpDistanceInput = document.createElement("input");
    jumpDistanceInput.type = "text";
    jumpDistanceInput.id = OPND_PLAYER_JUMP_DISTANCE_INPUT_ID;
    // TODO: Figure out how to check the jump distance string and how to display the error message
    //jumpDistanceInput.pattern = DURATION_PATTERN;
    //jumpDistanceInput.title = chrome.i18n.getMessage("playerJump_errMsg");
    toolbar.appendChild(jumpDistanceInput);

    // Build "Jump Forward" button
    const jumpForwardBtn = buildPlayerToolbarButton(OPND_PLAYER_JUMP_FORWARD_BTN_ID, handlePlayerJumpForwardAction, OPND_PLAYER_JUMP_FORWARD_TOOLTIP_SPAN_ID, "playerJumpForward", null, "imgs/jump_forward_white.svg");
    toolbar.appendChild(jumpForwardBtn);

    // Pressing Enter in the "Jump Distance" text input should trigger the "Jump Forward" button
    jumpDistanceInput.addEventListener("keyup", function (event) {
        event.preventDefault();
        if (event.keyCode === 13) { // 13 = ENTER
            jumpForwardBtn.click();
        }
        handleJumpDistanceInputValueChange();
    });

    return toolbar;
}

function handleJumpDistanceInputValueChange() {
    const jumpDistanceInput = document.getElementById(OPND_PLAYER_JUMP_DISTANCE_INPUT_ID);
    const playerJumpBackwardTooltipSpan = document.getElementById(OPND_PLAYER_JUMP_BACKWARD_TOOLTIP_SPAN_ID);
    const playerJumpForwardTooltipSpan = document.getElementById(OPND_PLAYER_JUMP_FORWARD_TOOLTIP_SPAN_ID);

    if (jumpDistanceInput && playerJumpBackwardTooltipSpan && playerJumpForwardTooltipSpan) {
        const jumpDistanceInputValue = normalizeDurationString(jumpDistanceInput.value);

        const backwardMsg = chrome.i18n.getMessage("playerJumpBackward", jumpDistanceInputValue);
        playerJumpBackwardTooltipSpan.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, backwardMsg);

        const forwardMsg = chrome.i18n.getMessage("playerJumpForward", jumpDistanceInputValue);
        playerJumpForwardTooltipSpan.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, forwardMsg);
    }
}

/**
 *
 * @param id {!string}
 * @param onclick {!function}
 * @param tooltipId {?string}
 * @param tooltipTxtMsgName {?string} il8n message name for the tooltip text and image alt
 * @param imgId {?string}
 * @param imgSrc {?string} relative URL in the extension directory
 * @returns {!Element}
 */
function buildPlayerToolbarButton(id, onclick, tooltipId = null, tooltipTxtMsgName = null, imgId = null, imgSrc = null) {
    // Build button
    const btn = document.createElement("button");
    btn.id = id;
    btn.classList.add(TWITCH_PLAYER_BTN_CLASS);
    btn.onclick = onclick;

    // Build button content span
    const content = document.createElement("span");
    btn.appendChild(content);

    // Build tooltip
    const tooltipTxtMsg = tooltipTxtMsgName !== null ? chrome.i18n.getMessage(tooltipTxtMsgName) : null;
    const tooltip = document.createElement("span");
    tooltip.id = tooltipId;
    tooltip.classList.add(TWITCH_PLAYER_TOOLTIP_SPAN_CLASS);
    if (tooltipTxtMsg !== null) {
        tooltip.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, tooltipTxtMsg);
    }
    content.appendChild(tooltip);

    // Build img
    const img = document.createElement("img");
    img.id = imgId;
    if (imgSrc !== null) {
        img.src = chrome.runtime.getURL(imgSrc);
    }
    if (tooltipTxtMsg !== null) {
        img.alt = chrome.i18n.getMessage(tooltipTxtMsg);
    }

    content.appendChild(img);

    // const svg = document.createElement("svg");
    // svg.innerHTML='<svg viewBox="0 0 30 30" id="icon_settings" width="100%" height="100%"><path clip-rule="evenodd" d="M13.3589744,7 L16.6410256,7 L18.0769231,9.8 L21.3589744,9.8 L23,12.2 L21.3589744,15 L23,17.8 L21.3589744,20.2 L18.0769231,20.2 L16.6410256,23 L13.3589744,23 L11.9230769,20.2 L8.64102564,20.2 L7,17.8 L8.64102564,15 L7,12.2 L8.64102564,9.8 L11.9230769,9.8 L13.3589744,7 Z M15,17.8 C16.5860485,17.8 17.8717949,16.5463973 17.8717949,15 C17.8717949,13.4536027 16.5860485,12.2 15,12.2 C13.4139515,12.2 12.1282051,13.4536027 12.1282051,15 C12.1282051,16.5463973 13.4139515,17.8 15,17.8 Z" fill-rule="evenodd"></path></svg>';

    return btn;
}

/* PROGRESS */
function handlePlayerShowHideDurationAction() {
    log("Handling action [Player: Show/Hide Duration]");

    // Toggle
    GLOBAL_playerDurationVisible = !GLOBAL_playerDurationVisible;

    configurePlayerDurationVisible();
}


/* Player: Jump */
function handlePlayerJumpBackwardAction() {
    log("Handling action [Player: Jump Backward]");
    playerJump(false);
}

function handlePlayerJumpForwardAction() {
    log("Handling action [Player: Jump Forward]");
    playerJump(true);
}

function playerJump(forward = true) {
    const sliderDiv = getSingleElementByClassName(TWITCH_PROGRESS_SLIDER_DIV_CLASS);
    if (!sliderDiv) {
        error("Time jump failed: slider not available", TWITCH_PROGRESS_SLIDER_DIV_CLASS);
        return;
    }

    // Get min, max, current time in seconds
    const minTime = parseInt(sliderDiv.getAttribute("aria-valuemin"));
    const maxTime = parseInt(sliderDiv.getAttribute("aria-valuemax"));
    const currentTime = parseInt(sliderDiv.getAttribute("aria-valuenow"));

    if (maxTime === 0) {
        error("Time jump failed: video duration not available");
        return;
    }

    // Get the jump distance in seconds
    const jumpDirection = forward ? 1 : -1;
    const jumpDistanceInputValue = document.getElementById(OPND_PLAYER_JUMP_DISTANCE_INPUT_ID).value;
    const jumpDistance = parseDuration(jumpDistanceInputValue);
    if (jumpDistance === 0) {
        log("Time jump failed: No valid jump distance given: %s", jumpDistanceInputValue);
        return;
    }

    // Add/Subtract the jump distance to/from the current time (but require: minTime < newTime < maxTime)
    const newTime = Math.min(maxTime, Math.max(minTime, currentTime + jumpDistance * jumpDirection));

    // Build the new url
    const newTimeUrl = buildCurrentUrlWithTime(newTime);
    log("Jumping %is: %is -> %is (%s)", jumpDistance, currentTime, newTime, newTimeUrl);
    window.location.assign(newTimeUrl);
}


/*
 * ====================================================================================================
 * INIT
 * ====================================================================================================
 */
function init() {
    log("Initializing...");

    resetGlobalPageFlags();
    listenForMessages();
    loadOptions();
    determinePageType();
    startCheckPageTask();
}

init();