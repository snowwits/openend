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


/*
 * ====================================================================================================
 * GLOBAL FLAGS
 * ====================================================================================================
 */
/* Variables that only change after a page change */
let GLOBAL_pageType = null;
/* Variables that can change at any time */
let GLOBAL_options = getDefaultOptionsCopy();
/**
 *
 * @type {?Channel}
 */
let GLOBAL_channel = null;
const SfmEnabledForPage = Object.freeze({
    ENABLED: "ENABLED",
    DISABLED: "DISABLED",
    UNDETERMINED: "UNDETERMINED"
});
let GLOBAL_sfmEnabledForPage = SfmEnabledForPage.UNDETERMINED;

/* Flags whether the components have been configured yet */
let GLOBAL_configured_flags = getDefaultConfiguredFlagsCopy();
let GLOBAL_configurationTimeoutReached = false;

/*
 * ====================================================================================================
 * UTIL FUNCTIONS
 * ====================================================================================================
 */
/**
 *
 * @param time {!number} in seconds
 * @return {!string} the URL with the time parameter
 */
function buildCurrentUrlWithTime(time) {
    const newTimeFormatted = formatDuration(time);
    const urlParams = newTimeFormatted.length > 0 ? "?t=" + newTimeFormatted : "";
    return window.location.protocol + "//" + window.location.hostname + window.location.pathname + urlParams;
}

/*
 * ====================================================================================================
 * CONFIGURATION
 * ====================================================================================================
 */
function getDefaultConfiguredFlagsCopy() {
    return {
        [OPT_SFM_PLAYER_HIDE_DURATION_NAME]: false,
        [OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]: false,
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: false,
        [OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]: false,
        [OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]: false,
        [OPT_GENERAL_THEATRE_MODE_NAME]: false,
    };
}

/**
 *
 * @param optionName {!string}
 * @return {?boolean} true if configured, false if not and null if unknown optionName
 */
function isConfigured(optionName) {
    return GLOBAL_configured_flags[optionName];
}

/**
 *
 *
 * @param optionName {!string}
 * @param value {!boolean}
 */
function setConfigured(optionName, value) {
    GLOBAL_configured_flags[optionName] = value;
    if (value) {
        log("%s configured", optionName);
    } else {
        log("%s needs to be reconfigured", optionName);
    }
}

function resetGlobalPageFlags() {
    GLOBAL_pageType = null;
    updateChannel(null);
    resetGlobalPageStateFlagsAfterOptionsUpdate(GLOBAL_options)
}

function resetGlobalPageStateFlagsAfterOptionsUpdate(options) {
    // Collect all options that need to be reconfigured in a Set
    const optionsToReconfigure = new Set();
    // Add all options that changed
    for (let optionName in options) {
        if (optionName in GLOBAL_configured_flags) {
            optionsToReconfigure.add(optionName);
        }
    }
    if (OPT_SFM_ENABLED_NAME in options || OPT_SFM_CHANNELS_NAME in options) {
        GLOBAL_sfmEnabledForPage = SfmEnabledForPage.UNDETERMINED;
        // If SFM enabled changed, all the SFM options need to be reconfigured
        for (let optionName in GLOBAL_configured_flags) {
            if (optionName.includes("sfm")) {
                optionsToReconfigure.add(optionName);
            }
        }
    }

    for (let optionName of optionsToReconfigure) {
        setConfigured(optionName, false);
    }
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

/**
 *
 * @param channel {?Channel}
 */
function updateChannel(channel) {
    GLOBAL_channel = channel;
    log("Updated channel to [%o]", GLOBAL_channel);

    // Notify about TabInfo change
    const tabInfoMessage = buildTabInfoMessage();
    chrome.runtime.sendMessage(tabInfoMessage, function (response) {
        log("Message [%o] was successfully sent", tabInfoMessage);
    });
}

function startCheckPageTask() {
    let pageChangedTime = Date.now();
    let oldLocation = createLocationIdentifier(location);

    const constCheckPageTask = function () {
        // Check for location changes
        const newLocation = createLocationIdentifier(location);
        if (newLocation !== oldLocation) {
            log("Window location changed from [%s] to [%s]", oldLocation, newLocation);
            oldLocation = createLocationIdentifier(location);
            pageChangedTime = Date.now();
            handlePageChange();
        }

        // If neither config done yet nor timeout reached yet
        if (!GLOBAL_configurationTimeoutReached) {
            const checkTime = Date.now();
            if (checkTime - pageChangedTime < PAGE_CONFIGURATION_TIMEOUT) {
                configurePage();
            }
            else {
                GLOBAL_configurationTimeoutReached = true;
                if (!isPageConfigured()) {
                    warn("Page configuration timeout reached (%d ms). Some components may not be configured. Configuration state: %o", PAGE_CONFIGURATION_TIMEOUT, formatPageConfigurationState());
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
    return location.hostname + location.pathname + location.search;
}

function handlePageChange() {
    resetGlobalPageFlags();

    // Determine page
    determinePageType();
}

function configurePage() {
    if (isPageConfigured()) {
        return;
    }
    determineChannel();
    determineSfmEnabledForPage();
    configurePlayer();
    configureVideoListItems();
    configureTheatreMode();
}

function isPageConfigured() {
    return isChannelDetermined() && isSfmEnabledForPageDetermined() && isPlayerConfigured() && isVideoListItemsConfigured() && isTheatreModeConfigured();
}

function formatPageConfigurationState() {
    return `channelDetermined: ${isChannelDetermined()}, sfmEnabledForPageDetermine: ${isSfmEnabledForPageDetermined()}, playerConfigured: ${isPlayerConfigured()}, videoListItemsConfigured: ${isVideoListItemsConfigured()}, theatreModeConfigured: ${isTheatreModeConfigured()}`;
}


/*
 * ====================================================================================================
 * CONFIGURATION: Determine Channel & SfmEnabledForPage
 * ====================================================================================================
 */
/**
 * <a data-target="channel-header__channel-link" data-a-target="user-channel-header-item" class="channel-header__user align-items-center flex flex-shrink-0 flex-nowrap pd-r-2 pd-y-05" href="/mdz_jimmy">
 * ...
 * </a>
 */
function determineChannel() {
    if (isChannelDetermined()) {
        return;
    }
    const channelLinkAnchor = document.querySelector("a[data-target=channel-header__channel-link]");
    if (channelLinkAnchor) {
        const pageTypResult = TWITCH_PLATFORM.determinePage(channelLinkAnchor.hostname, channelLinkAnchor.pathname, channelLinkAnchor.search);
        if (pageTypResult && pageTypResult.channel) {
            updateChannel(pageTypResult.channel);
        }
        else {
            warn("Failed to parse channel from hostname=%s, pathname=%s, search=%s", channelLinkAnchor.hostname, channelLinkAnchor.pathname, channelLinkAnchor.search);
        }
    }
}

function isChannelDetermined() {
    return GLOBAL_channel !== null
}

function determineSfmEnabledForPage() {
    if (isSfmEnabledForPageDetermined()) {
        return;
    }
    const sfmEnabled = GLOBAL_options[OPT_SFM_ENABLED_NAME];
    if (SfmEnabled.ALWAYS === sfmEnabled) {
        GLOBAL_sfmEnabledForPage = SfmEnabledForPage.ENABLED;
    } else if (SfmEnabled.NEVER === sfmEnabled) {
        GLOBAL_sfmEnabledForPage = SfmEnabledForPage.DISABLED;
    } else if (SfmEnabled.CUSTOM) {
        if (GLOBAL_channel !== null) {
            const sfmChannels = GLOBAL_options[OPT_SFM_CHANNELS_NAME];
            if (sfmChannels.includes(GLOBAL_channel.qualifiedName)) {
                GLOBAL_sfmEnabledForPage = SfmEnabledForPage.ENABLED;
            }
            else {
                GLOBAL_sfmEnabledForPage = SfmEnabledForPage.DISABLED;
            }
        }
    }
    if (isSfmEnabledForPageDetermined()) {
        log("Spoiler-Free Mode enabled for page: %s", GLOBAL_sfmEnabledForPage);
    }
}

function isSfmEnabledForPageDetermined() {
    return SfmEnabledForPage.UNDETERMINED !== GLOBAL_sfmEnabledForPage;
}

function isSfmEnabledForPage() {
    return SfmEnabledForPage.ENABLED === GLOBAL_sfmEnabledForPage;
}

function isSfmDisabledForPage() {
    return SfmEnabledForPage.DISABLED === GLOBAL_sfmEnabledForPage;
}


/*
 * ====================================================================================================
 * CONFIGURATION: Video Player
 * ====================================================================================================
 */
function configurePlayer() {
    if (isPlayerConfigured() || !isSfmEnabledForPageDetermined()) {
        return;
    }

    if (isSfmEnabledForPage()) {
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
            configurePlayerJumpDistanceInputAndButtons();

            // Set initial Show/Hide Duration state
            updatePayerDurationVisibleAndShowHideButton(true, !GLOBAL_options[OPT_SFM_PLAYER_HIDE_DURATION_NAME]);
        }
    }
    // If SFM disabled, configure accordingly (may remove)
    else if (isSfmDisabledForPage()) {
        // Remove old toolbar
        const toolbar = document.getElementById(OPND_PLAYER_TOOLBAR_ID);
        if (toolbar) {
            toolbar.parentNode.removeChild(toolbar);
            log("Removed Open End Toolbar");
        }

        // Set the configured flag for the jump distance as well because it doesn't need any configuration in this case
        setConfigured(OPT_SFM_PLAYER_JUMP_DISTANCE_NAME, true);

        // Set initial Show/Hide Duration state
        updatePayerDurationVisibleAndShowHideButton(true, true);
    }
}

function isPlayerConfigured() {
    return isPlayerDurationConfigured() && isPlayerJumpDistanceConfigured();
}

/**
 * @param configuring {!boolean} if the method is called during configuration and not because of an UI event
 * @param visible {?boolean} true, false or null (to toggle)
 */
function updatePayerDurationVisibleAndShowHideButton(configuring, visible) {
    if (configuring && isPlayerDurationConfigured()) {
        return;
    }
    // Make progress indicators visible / hidden
    const allElementsToToggle = getElementsByClassNames([TWITCH_PROGRESS_TOTAL_TIME_DIV_CLASS, TWITCH_PROGRESS_SLIDER_DIV_CLASS]);

    if (allElementsToToggle.length > 0) {
        const setVisibleResult = setVisible(allElementsToToggle, visible);
        log("Updated Player Duration visible to [%s]", setVisibleResult);

        // Update the Player Progress Visibility img src and alt
        const tooltip = chrome.i18n.getMessage(setVisibleResult ? "playerShowHideDuration_visible" : "playerShowHideDuration_hidden");
        const showHidePlayerDurationImg = document.getElementById(OPND_PLAYER_SHOW_HIDE_DURATION_IMG_ID);
        if (showHidePlayerDurationImg) {
            showHidePlayerDurationImg.src = chrome.runtime.getURL(setVisibleResult ? "imgs/hide_white.svg" : "imgs/show_white.svg");
            showHidePlayerDurationImg.alt = tooltip
        }

        const showHidePlayerDurationTooltipSpan = document.getElementById(OPND_PLAYER_SHOW_HIDE_DURATION_TOOLTIP_SPAN_ID);
        if (showHidePlayerDurationTooltipSpan) {
            showHidePlayerDurationTooltipSpan.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, tooltip);
        }

        if (configuring) {
            setConfigured(OPT_SFM_PLAYER_HIDE_DURATION_NAME, true);
        }
    }
}

function isPlayerDurationConfigured() {
    return GLOBAL_pageType !== TwitchPageType.VIDEO || isConfigured(OPT_SFM_PLAYER_HIDE_DURATION_NAME);
}

function configurePlayerJumpDistanceInputAndButtons() {
    if (isPlayerJumpDistanceConfigured()) {
        return;
    }
    const jumpDistanceElem = document.getElementById(OPND_PLAYER_JUMP_DISTANCE_INPUT_ID);
    if (jumpDistanceElem) {
        jumpDistanceElem.value = GLOBAL_options[OPT_SFM_PLAYER_JUMP_DISTANCE_NAME];
        log("Updated Player Time Jump Distance value to [%s]", GLOBAL_options[OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]);
        setConfigured(OPT_SFM_PLAYER_JUMP_DISTANCE_NAME, true);
    }

    updateJumpButtonsAfterJumpDistanceChange();
}

function isPlayerJumpDistanceConfigured() {
    return GLOBAL_pageType !== TwitchPageType.VIDEO || isConfigured(OPT_SFM_PLAYER_JUMP_DISTANCE_NAME);
}

function updateJumpButtonsAfterJumpDistanceChange() {
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


/*
 * ====================================================================================================
 * CONFIGURATION: Video List Items
 * ====================================================================================================
 */
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
function configureVideoListItems() {
    if (isVideoListItemsConfigured() || !isSfmEnabledForPageDetermined()) {
        return;
    }
    const videoDurationVisible = isSfmDisabledForPage() || !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME];
    const videoStatDivs = document.getElementsByClassName("video-preview-card__preview-overlay-stat");
    if (videoStatDivs.length > 0) {
        for (let i = 0; i < videoStatDivs.length; ++i) {
            const videoStatDiv = videoStatDivs[i];
            const videoLengthDiv = videoStatDiv.querySelector('div[data-test-selector="video-length"]');
            if (videoLengthDiv) {
                setVisible([videoStatDiv], videoDurationVisible);
            }
        }
        log("Updated Video List Item durations visible to [%s]", videoDurationVisible);
        setConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME, true);
    }
}

function isVideoListItemsConfigured() {
    return isConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME); // TODO: && isConfigured(OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME) && isConfigured(OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME);
}


/*
 * ====================================================================================================
 * CONFIGURATION: Theatre Mode
 * ====================================================================================================
 */
function configureTheatreMode() {
    if (isTheatreModeConfigured()) {
        return;
    }
    const theatreModeBtn = getSingleElementByClassName(TWITCH_THEATRE_MODE_BTN_CLASS);
    if (theatreModeBtn) {
        const isActive = isTheatreModeActive(theatreModeBtn);
        if (GLOBAL_options[OPT_GENERAL_THEATRE_MODE_NAME] !== isActive) {
            log("" + (GLOBAL_options[OPT_GENERAL_THEATRE_MODE_NAME] ? "Entering" : "Exiting") + " Player Theatre Mode");
            theatreModeBtn.click();
        }
        setConfigured(OPT_GENERAL_THEATRE_MODE_NAME, true);
    }
}

function isTheatreModeConfigured() {
    return (GLOBAL_pageType !== TwitchPageType.VIDEO && GLOBAL_pageType !== TwitchPageType.CHANNEL) || isConfigured(OPT_GENERAL_THEATRE_MODE_NAME);
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
 * @param theatreModeButton {Element} the theatre mode toggle button node (not null)
 * @return {boolean}
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

/*
 * ====================================================================================================
 * BUILD TOOLBAR
 * ====================================================================================================
 */
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
        updateJumpButtonsAfterJumpDistanceChange();
        if (event.keyCode === 13) { // 13 = ENTER
            jumpForwardBtn.click();
        }
    });

    return toolbar;
}


/**
 *
 * @param id {!string}
 * @param onclick {!function}
 * @param tooltipId {?string}
 * @param tooltipTxtMsgName {?string} il8n message name for the tooltip text and image alt
 * @param imgId {?string}
 * @param imgSrc {?string} relative URL in the extension directory
 * @return {!Element}
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

/*
 * ====================================================================================================
 * ACTION HANDLING
 * ====================================================================================================
 */
function handlePlayerShowHideDurationAction() {
    log("Handling action [Player: Show/Hide Duration]");

    // Toggle
    updatePayerDurationVisibleAndShowHideButton(false, null);
}

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
        error("Time jump failed: Video duration not available (yet)");
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
 * MESSAGE HANDLING
 * ====================================================================================================
 */
function listenForMessages() {
    chrome.runtime.onMessage.addListener(handleMessage);
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

/*
 * ====================================================================================================
 * OPTIONS
 * ====================================================================================================
 */
function listenForOptionsChanges() {
    chrome.storage.onChanged.addListener(handleOptionUpdate);
}

function handleOptionUpdate(changes, namespace) {
    log("[%s storage] Changes: %o", namespace, changes);
    for (const key in changes) {
        GLOBAL_options[key] = changes[key].newValue;
    }
    reconfigurePageAfterOptionsUpdate(mapOptionChangesToItems(changes));
}


function reconfigurePageAfterOptionsUpdate(options) {
    resetGlobalPageStateFlagsAfterOptionsUpdate(options);
    configurePage();
}


/*
 * ====================================================================================================
 * INIT
 * ====================================================================================================
 */
function init() {
    log("Initializing...");

    resetGlobalPageFlags();
    determinePageType();

    chrome.storage.sync.get(getDefaultOptionsCopy(), function (items) {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to get options: %o", chrome.runtime.lastError);
            return;
        }
        GLOBAL_options = items;
        log("Loaded options: %o", GLOBAL_options);

        listenForOptionsChanges();
        listenForMessages();
        startCheckPageTask();
    });
}

init();