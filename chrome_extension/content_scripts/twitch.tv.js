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
/* Constants element IDs and classes */
const TWITCH_PLAYER_CLASS = "player";
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

/**
 *
 * @type {string} the CSS class of the video list container
 */
const TWITCH_VIDEO_LIST_CONTAINER_CLASS = "tw-tower";
/**
 * @type {string} the CSS class of the video cards (not the video list item container, that is some un-classed div above the card div)
 */
const TWITCH_VIDEO_LIST_ITEM_CARD_CLASS = "tw-card";

/*
 * ====================================================================================================
 * GLOBAL FLAGS
 * ====================================================================================================
 */
/* Variables that only need to be changed after a page change */
/**
 *
 * @type {boolean} Whether the timeout to periodically check for new elements has been reached yet.
 * This will be set to true once the timeout is reached and will be reset whenever {@link GLOBAL_pageChangedTime} is reset.
 */
let GLOBAL_elementsLoadedTimeoutReached = false;
/*
 * @type {!Date} The last time the page changed asynchronously. Changes can be:
 * <ul>
 *     <li>The location changed (new URL)</li>
 *     <li>Some content was added (e.g. async loading of more video list items)</li>
 * </ul>
 */
let GLOBAL_pageChangedTime;
/**
 *
 * @type {?string} {@link TwitchPageType}
 */
let GLOBAL_pageType = null;

/**
 *
 * @type {?MutationObserver} observes whether the href attribute of the channel link anchor changes.
 *
 * Sometimes, when changing the channel on-page, the channel link is not updated immediately.
 * In this case the parsing of the channel link after a page change happens before the channel link is replaced with the new channel.
 * This leads to the previous channel being determined as the current channel and not the new channel.
 *
 * Therefore, we need to observe the channel link anchor's href attribute for changes to then re-determine the channel.
 *
 */
let GLOBAL_channelLinkAnchorHrefObserver = null;

/**
 *
 * @type {?Array<MutationObserver>} the observers that observe all video list for new videos being added
 */
let GLOBAL_videoListObservers = [];

/* Variables that can change at any given time */
/**
 * Options can change at any time (when the user changes the options).
 */
let GLOBAL_options = getDefaultOptionsCopy();
/**
 * The channel changes to null when a new page is loaded and changes to a non-null value, when the channel was determined.
 * On video pages this can take some time because the channel cannot be parsed from the URL but can only be parsed from the DOM which is loaded asynchronously.
 *
 * @type {?Channel}
 */
let GLOBAL_channel = null;

/* Variables that need to be changed after options or channel changes */
/**
 * @type {?string} {@link SfmState}
 */
let GLOBAL_sfmState = null;
/**
 * Flags whether the dependencies of certain options have been configured yet
 */
let GLOBAL_configuredFlags = getDefaultConfiguredFlagsCopy();
/**
 * Whether relevant info for the TabInfo changed and the TabInfo message should be sent out on the end of this configurePage() cycle.
 */
let GLOBAL_tabInfoChanged = true;

/*
 * ====================================================================================================
 * UTIL FUNCTIONS
 * ====================================================================================================
 */


/*
 * ====================================================================================================
 * CONFIGURATION
 * ====================================================================================================
 */
function getDefaultConfiguredFlagsCopy() {
    return {
        [OPT_SFM_PLAYER_HIDE_DURATION_NAME]: false,
        [OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]: false,
        [OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]: false,
        [OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]: false,
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: false,
        [OPT_GENERAL_THEATRE_MODE_NAME]: false,
    };
}

/**
 *
 * @param optionName {!string}
 * @return {?boolean} true if configured, false if not and null if unknown optionName
 */
function isConfigured(optionName) {
    return GLOBAL_configuredFlags[optionName];
}

/**
 *
 *
 * @param optionName {!string}
 * @param value {!boolean}
 */
function setConfigured(optionName, value) {
    GLOBAL_configuredFlags[optionName] = value;
    if (value) {
        log("Dependencies of option [%s] configured", optionName);
    } else {
        log("Dependencies of option [%s] need reconfiguration", optionName);
    }
}

function setSfmOptionsToNotConfigured() {
    for (let optionName in GLOBAL_configuredFlags) {
        if (isSfmOption(optionName)) {
            setConfigured(optionName, false);
        }
    }
}

function resetGlobalPageFlags() {
    resetGlobalPageChangedTime();
    GLOBAL_pageType = null;

    // Disconnect the observers and then reset the variables (null / empty array)
    if (GLOBAL_channelLinkAnchorHrefObserver) {
        GLOBAL_channelLinkAnchorHrefObserver.disconnect();
    }
    GLOBAL_channelLinkAnchorHrefObserver = null;
    for (let i = 0; i < GLOBAL_videoListObservers.length; i++) {
        GLOBAL_videoListObservers[i].disconnect();
    }
    GLOBAL_videoListObservers = [];

    updateChannel(null);
    resetGlobalPageStateFlags(GLOBAL_options)
}

function resetGlobalPageChangedTime() {
    GLOBAL_elementsLoadedTimeoutReached = false;
    GLOBAL_pageChangedTime = Date.now();
}

function resetGlobalPageStateFlags(changedOptions) {
    // If something about SFM enabled changed, sfmState needs re-determination.
    // Also, all SFM dependencies need reconfiguration (they may be independent from sfmState, for example video list items on a directory/game/Overwatch page can be from several channels).
    if (containsSfmEnabledOption(changedOptions)) {
        updateSfmState(null);
        determineSfmState();

        setSfmOptionsToNotConfigured();
    }

    // All changed options need re-determination
    for (let optionName in GLOBAL_configuredFlags) {
        if (optionName in changedOptions) {
            setConfigured(optionName, false);
        }
    }
}

function determinePageType() {
    const pageTypeResult = TWITCH_PLATFORM.parsePageFromUrl(window.location);
    if (pageTypeResult) {
        GLOBAL_pageType = pageTypeResult.pageType;
        if (pageTypeResult.channel) {
            updateChannel(pageTypeResult.channel);
        }
    }
    log("Page type: %s", GLOBAL_pageType);
}

function startCheckPageTask() {
    resetGlobalPageChangedTime();
    let oldLocation = createLocationIdentifier(location);

    const constCheckPageTask = function () {
        // Check for location changes
        const newLocation = createLocationIdentifier(location);
        if (newLocation !== oldLocation) {
            log("Window location changed from [%s] to [%s]", oldLocation, newLocation);
            oldLocation = createLocationIdentifier(location);
            handlePageChange();
        }

        // As long as the timeout has not been reached, periodically try to configure the page
        if (!GLOBAL_elementsLoadedTimeoutReached) {
            const checkTime = Date.now();
            if (checkTime - GLOBAL_pageChangedTime < PAGE_CONFIGURATION_TIMEOUT) {
                configurePage();
            }
            else {
                GLOBAL_elementsLoadedTimeoutReached = true;
                if (isPageConfigured()) {
                    log("Elements loaded timeout reached (%d ms). Page fully configured", PAGE_CONFIGURATION_TIMEOUT);
                }
                else {
                    log("Elements loaded timeout reached (%d ms). Some components may not be configured. Configuration state: %o", PAGE_CONFIGURATION_TIMEOUT, formatPageConfigurationState());
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
    cleanPage();

    resetGlobalPageFlags();

    // Determine page
    determinePageType();
}

function configurePage() {
    if (isPageConfigured()) {
        return;
    }
    determineChannel();
    determineSfmState();
    configurePlayer();
    configureVideoListItems();
    configureTheatreMode();
    sendTabInfoMessage();
}

function isPageConfigured() {
    return isChannelDetermined() && isSfmStateDetermined() && isPlayerConfigured() && isVideoListItemsConfigured() && isTheatreModeConfigured();
}

function formatPageConfigurationState() {
    return `channelDetermined: ${isChannelDetermined()}, sfmStateDetermined: ${isSfmStateDetermined()}, playerConfigured: ${isPlayerConfigured()}, videoListItemsConfigured: ${isVideoListItemsConfigured()}, theatreModeConfigured: ${isTheatreModeConfigured()}`;
}


/*
 * ====================================================================================================
 * CONFIGURATION: Determine Channel
 * ====================================================================================================
 */
/**
 * Channel link above the video player in a directory or watching a VOD (twitch.tv/<channel>/... twitch.tv/videos/<video-id>):
 *
 * <a data-target="channel-header__channel-link" data-a-target="user-channel-header-item" class="channel-header__user align-items-center flex flex-shrink-0 flex-nowrap pd-r-2 pd-y-05" href="/silkthread">
 *  <div class="align-items-center flex flex-shrink-0 flex-nowrap">
 *      <div class="channel-header__user-avatar channel-header__user-avatar--active align-items-stretch flex flex-shrink-0 mg-r-1">
 *          <figure class="tw-avatar tw-avatar--size-36">
 *              <img class="" src="https://static-cdn.jtvnw.net/jtv_user_pictures/silkthread-profile_image-9f2fe572026ab4d7-70x70.jpeg" alt="silkthread">
 *          </figure>
 *     </div>
 *     <h5 class="">silkthread</h5>
 *  </div>
 * </a>
 *
 * Channel link above the video player on the channel main page (both when channel is online or offline):
 *
 * <div class="channel-header__banner-toggle channel-header__user channel-header__user--selected tw-align-items-center tw-flex tw-flex-shrink-0 tw-flex-nowrap tw-pd-r-2 tw-pd-y-05"
 data-target="channel-header__channel-link" data-a-target="user-channel-header-item">
 <div class="tw-align-items-center tw-flex tw-flex-shrink-0 tw-flex-nowrap">
 <div class="channel-header__user-avatar channel-header__user-avatar--active tw-align-items-stretch tw-flex tw-flex-shrink-0 tw-mg-r-1">
 <div class="tw-relative">
 <figure class="tw-avatar tw-avatar--size-36"><img class="" src="https://static-cdn.jtvnw.net/jtv_user_pictures/0970ece79c664200-profile_image-70x70.png" alt="오버워치_이스포츠"></figure>
 </div>
 </div>
 <h5 class="">오버워치_이스포츠</h5>
 <div class="tw-tooltip-wrapper tw-inline-flex" aria-describedby="39e3faf8f9edaf01041d1a04b34c156f">
 <div data-target="channel-header__verified-badge"
 class="channel-header__verified tw-align-items-center tw-flex tw-mg-l-1">
 <figure class="tw-svg">
 <svg class="tw-svg__asset tw-svg__asset--verified tw-svg__asset--inherit" width="16px" height="16px"
 version="1.1" viewBox="0 0 18 18" x="0px" y="0px">
 <path d="M2.636 2.636L9 0l6.365 2.636L18 9l-2.635 6.365L9 18l-6.364-2.635L0 9l2.636-6.364zM7.38 13.11l6.097-6.42-1.45-1.378-4.726 4.98-1.613-1.52-1.37 1.458 3.065 2.88z"></path>
 </svg>
 </figure>
 </div>
 <div class="tw-tooltip tw-tooltip--right tw-tooltip--align-center" data-a-target="tw-tooltip-label"
 role="tooltip" id="39e3faf8f9edaf01041d1a04b34c156f">Verified
 </div>
 </div>
 </div>
 </div>
 *
 *
 *
 *
 */
function determineChannel() {
    if (isChannelDetermined()) {
        return;
    }

    /**
     * If on channel directory or video page, we can parse the channel link <a> element
     */
    const channelLinkAnchor = document.querySelector("a[data-target=channel-header__channel-link]");
    if (channelLinkAnchor) {
        const pageTypResult = TWITCH_PLATFORM.parsePageFromUrl(channelLinkAnchor);
        if (pageTypResult && pageTypResult.channel) {
            const channelHeading = channelLinkAnchor.querySelector("h5");
            if (channelHeading) {
                pageTypResult.channel.displayName = channelHeading.textContent;
            }
            updateChannel(pageTypResult.channel);
            observeChannelLinkAnchorHref(channelLinkAnchor);
        }
    }

    /*
     *  If on channel main page, we need to parse the channel link <div> element
     *
     *  Sadly, the channel's qualified name is not present in this div,
     *  so we have to take it from the (hopefully) already parsed channel from the URL (GLOBAL_channel).
     */
    if (GLOBAL_channel !== null) {
        const channelLinkDiv = document.querySelector("div[data-target=channel-header__channel-link]");
        if (channelLinkDiv) {
            const channelHeading = channelLinkDiv.querySelector("h5");
            if (channelHeading) {
                // Create a new channel instance because we want to replace the current channel object, not modify it
                const channel = Channel.parseFromQualifiedName(GLOBAL_channel.qualifiedName);
                channel.displayName = channelHeading.textContent;
                updateChannel(channel);
            }
        }
    }
}

/**
 *
 * @param {!HTMLAnchorElement} channelLinkAnchor
 */
function observeChannelLinkAnchorHref(channelLinkAnchor) {
    if (GLOBAL_channelLinkAnchorHrefObserver !== null) {
        return;
    }

    const observer = new MutationObserver((mutations) => {
        let channelLinkChanged = false;
        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i];
            if (mutation.type === "attributes" && mutation.attributeName === "href") {
                channelLinkChanged = true;
                const oldHref = mutation.oldValue;
                const newHref = mutation.target.href;
                log("Channel link changed from [%s] to [%s]. Channel needs re-determination", oldHref, newHref);
                break;
            }
        }
        if (channelLinkChanged) {
            updateChannel(null);
        }
    });

    // Config: Observe the attribute href and also report the old value
    const config = {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["href"]
    };

    observer.observe(channelLinkAnchor, config);

    GLOBAL_channelLinkAnchorHrefObserver = observer;

    log("Added observer to channel link [%o]", channelLinkAnchor);
}

function isChannelDetermined() {
    /*
     * Channel is only fully determined if the displayName has been determined, too.
     * That cannot be achieved by parsing the location URL, that can only be done by parsing the channel link.
     * See function determineChannel().
     */
    return GLOBAL_channel !== null && GLOBAL_channel.displayName !== null;
}

/**
 *
 * @param channel {?Channel}
 */
function updateChannel(channel) {
    const isChange = GLOBAL_channel !== channel;
    // If the channel changed, sfmState needs to be redetermined.
    // Also, the TabInfo message needs to be send out
    if (isChange) {
        GLOBAL_channel = channel;
        log("Updated [channel] to [%o]", GLOBAL_channel);

        // SfmState needs to be re-determined after a channel change
        updateSfmState(null);

        // Notify about TabInfo change (new channel)
        signalTabInfoChanged("channel");

        mayUpdateChannelDisplayName();
    }
}

/**
 * Check if display name has changed since channel was stored.
 * If it did, update the stored channel's display name.
 */
function mayUpdateChannelDisplayName() {
    if (GLOBAL_channel && GLOBAL_channel.displayName !== null) {
        const storedChannels = getOptSfmEnabledChannels(GLOBAL_options);
        const storedChannel = storedChannels.find((channel) => {
            return Channel.equal(channel, GLOBAL_channel);
        });
        if (storedChannel && GLOBAL_channel.displayName !== storedChannel.displayName) {
            log("Updating stored channel's display name because it changed: stored channel [%o], current channel [%o]", storedChannel, GLOBAL_channel);
            storedChannel.displayName = GLOBAL_channel.displayName;
            opnd.browser.writeOptions({[OPT_SFM_ENABLED_CHANNELS_NAME]: storedChannels});
        }
    }
}


/*
 * ====================================================================================================
 * CONFIGURATION: SfmState
 * ====================================================================================================
 */

function determineSfmState() {
    if (isSfmStateDetermined()) {
        return;
    }
    updateSfmState(checkSfmState(GLOBAL_options, TWITCH_PLATFORM, GLOBAL_channel));
}

function isSfmStateDetermined() {
    return GLOBAL_sfmState !== null;
}

function isSfmStateActive() {
    return SfmState.ACTIVE === GLOBAL_sfmState;
}

function isSfmStateInactive() {
    return SfmState.INACTIVE === GLOBAL_sfmState;
}

function isSfmStateChannelDependent() {
    return SfmState.CHANNEL_DEPENDENT === GLOBAL_sfmState;
}

/**
 *
 * @param sfmState {?string} {@link SfmState}
 */
function updateSfmState(sfmState) {
    const isChange = GLOBAL_sfmState !== sfmState;

    if (isChange) {
        GLOBAL_sfmState = sfmState;
        log("Updated [sfmState] to [%o]", GLOBAL_sfmState);

        // If the sfmState changed, SFM dependencies need reconfiguration
        setSfmOptionsToNotConfigured();

        // Notify about TabInfo change (new sfmState)
        signalTabInfoChanged("sfmState");
    }
}


/*
 * ====================================================================================================
 * CONFIGURATION: Video Player
 * ====================================================================================================
 */
function configurePlayer() {
    if (isPlayerConfigured()) {
        return;
    }

    if (isSfmStateActive()) {
        let toolbarElem = document.getElementById(OPND_PLAYER_TOOLBAR_ID);
        if (!toolbarElem) {
            // Search for injection container for toolbar (the left button panel)
            const injectionContainer = getSingleElementByClassName("player-buttons-left");
            if (injectionContainer) {
                toolbarElem = buildPlayerToolbar();
                injectionContainer.appendChild(toolbarElem);
                log("Injected Open End player toolbar");
            }
        }
        if (toolbarElem) {
            // Update Jump Distance value
            configurePlayerJumpDistanceInputAndButtons();

            // Set initial Show/Hide Duration state
            updatePlayerDurationVisibleAndShowHideButton(true, !GLOBAL_options[OPT_SFM_PLAYER_HIDE_DURATION_NAME]);
        }
    }
    else {
        removePlayerToolbarAndShowPlayerDuration();

        // Set the configured flag for the jump distance as well because it doesn't need any configuration in this case
        setConfigured(OPT_SFM_PLAYER_JUMP_DISTANCE_NAME, true);
    }
}

function isPlayerConfigured() {
    return isPlayerDurationConfigured() && isPlayerJumpDistanceConfigured();
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

        // Trigger the change event manually because programmatic changes do not trigger an input event
        updateJumpButtonsAfterJumpDistanceChange();
    }
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
        const jumpDistanceValue = parseDuration(jumpDistanceInputValue);
        let backwardMsg;
        let forwardMsg;
        if (jumpDistanceValue > 0) {
            backwardMsg = chrome.i18n.getMessage("player_jumpBackward", jumpDistanceInputValue);
            forwardMsg = chrome.i18n.getMessage("player_jumpForward", jumpDistanceInputValue);
        }
        else {
            backwardMsg = forwardMsg = chrome.i18n.getMessage("player_jump_err");
        }

        playerJumpBackwardTooltipSpan.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, backwardMsg);
        playerJumpForwardTooltipSpan.setAttribute(TWITCH_PLAYER_TOOLTIP_SPAN_TEXT_ATTR, forwardMsg);
    }
}

function removePlayerToolbarAndShowPlayerDuration() {
    // Remove old toolbar
    const toolbarElem = document.getElementById(OPND_PLAYER_TOOLBAR_ID);
    if (toolbarElem) {
        removeElement(toolbarElem);
        log("Removed Open End Toolbar");
    }

    // Set initial Show/Hide Duration state
    updatePlayerDurationVisibleAndShowHideButton(true, true);
}

/**
 * @param configuring {!boolean} if the method is called during configuration and not because of an UI event
 * @param visible {?boolean} true, false or null (to toggle)
 */
function updatePlayerDurationVisibleAndShowHideButton(configuring, visible) {
    if (configuring && isPlayerDurationConfigured()) {
        return;
    }
    // Make progress indicators visible / hidden
    const allDurationElements = getElementsByClassNames([TWITCH_PROGRESS_TOTAL_TIME_DIV_CLASS, TWITCH_PROGRESS_SLIDER_DIV_CLASS]);
    const opndContainersOfAllDurationElements = getOrWrapAllInOpndContainers(allDurationElements, OPND_CONTAINER_PLAYER_DURATION_CLASS);

    if (opndContainersOfAllDurationElements.length > 0) {
        const setVisibleResult = setAllVisible(opndContainersOfAllDurationElements, visible);
        log("Updated Player Duration visible to [%s]", setVisibleResult);

        // Update the Player Progress Visibility img src and alt
        const tooltip = chrome.i18n.getMessage(setVisibleResult ? "player_showHideDuration_visible" : "player_showHideDuration_hidden");
        const showHidePlayerDurationImg = document.getElementById(OPND_PLAYER_SHOW_HIDE_DURATION_IMG_ID);
        if (showHidePlayerDurationImg) {
            showHidePlayerDurationImg.src = chrome.runtime.getURL(setVisibleResult ? "img/hide_white.svg" : "img/show_white.svg");
            showHidePlayerDurationImg.alt = tooltip;
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

/*
 * ====================================================================================================
 * CONFIGURATION: Video List Items
 * ====================================================================================================
 */

function configureVideoListItems() {
    if (isVideoListItemsConfigured()) {
        return;
    }

    const videoCardDivs = document.getElementsByClassName(TWITCH_VIDEO_LIST_ITEM_CARD_CLASS);
    if (videoCardDivs.length === 0) {
        return;
    }

    const allTitleContainers = getVideoTitleOpndContainers();
    const allPreviewContainers = getVideoPreviewOpndContainers();
    const allDurationContainers = getVideoDurationOpndContainers();

    const setTitleVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME];
    const setPreviewVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME];
    const setDurationVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME];

    // If SFM = active, configure according to the SFM config
    if (isSfmStateActive()) {
        setAllVisible(allTitleContainers, setTitleVisible);
        setAllVisible(allPreviewContainers, setPreviewVisible);
        setAllVisible(allDurationContainers, setDurationVisible);

        for (let i = 0; i < videoCardDivs.length; i++) {
            const videoCardDiv = videoCardDivs[i];

            mayHideVideoListItem(videoCardDiv);

            injectVideoListItemToolbar(videoCardDiv);
        }
    }
    // If SFM = channel dependent,
    // only hide information of videos of channels for which SFM is enabled.
    else if (isSfmStateChannelDependent()) {
        for (let i = 0; i < videoCardDivs.length; i++) {
            const videoCardDiv = videoCardDivs[i];

            const videoTitleContainers = getVideoTitleOpndContainers(videoCardDiv);
            const videoPreviewContainers = getVideoPreviewOpndContainers(videoCardDiv);
            const videoDurationContainers = getVideoDurationOpndContainers(videoCardDiv);

            const channel = getVideoChannel(videoCardDiv);
            const sfmEnabledOnChannel = checkSfmState(GLOBAL_options, TWITCH_PLATFORM, channel);
            if (SfmState.ACTIVE === sfmEnabledOnChannel) {
                setAllVisible(videoTitleContainers, setTitleVisible);
                setAllVisible(videoPreviewContainers, setPreviewVisible);
                setAllVisible(videoDurationContainers, setDurationVisible);

                mayHideVideoListItem(videoCardDiv);

                injectVideoListItemToolbar(videoCardDiv);
            }
            // DISABLED
            else {
                setAllVisible(videoTitleContainers, true);
                setAllVisible(videoPreviewContainers, true);
                setAllVisible(videoDurationContainers, true);

                setHiddenVideoListItemVisible(videoCardDiv, true);

                removeVideoListItemToolbars(videoCardDiv);
            }
        }
    }
    // If SFM = inactive (or as fallback), show everything and remove toolbars
    else {
        setAllVisible(allTitleContainers, true);
        setAllVisible(allPreviewContainers, true);
        setAllVisible(allDurationContainers, true);

        setAllHiddenVideoListItemsVisible(true);

        removeVideoListItemToolbars();
    }

    if (videoCardDivs.length === allTitleContainers.length) {
        setConfigured(OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME, true);
        // If any loaded, add the observer to handle the async addition of more video list items in the future
        // (when scrolling to the end of the list, more items are loaded async)
        observeVideoListItemsAdded();
    }
    if (videoCardDivs.length === allPreviewContainers.length) {
        setConfigured(OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME, true);
    }
    if (videoCardDivs.length === allDurationContainers.length) {
        setConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME, true);
    }
}

function isVideoListItemsConfigured() {
    return isConfigured(OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME) && isConfigured(OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME) && isConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME);
}

function mayHideVideoListItem(videoCardDiv) {
    const videoTitle = getVideoTitle(videoCardDiv);
    if (videoTitle != null) {
        if (videoTitle.match(new RegExp("Inaugural\\sSeason\\s\\|\\sStage\\s+\\d+\\s+Week\\s+\\d+\\s+Day\\s+\\d+"))) {
            // console.log("VIDEO TITLE MATCH: " + videoTitle);
        } else {
            // console.log("VIDEO TITLE NO MATCH: " + videoTitle);
            const videoCardContainer = getVideoListItemContainer(videoCardDiv);
            const opndContainer = getOrWrapInOpndContainer(videoCardContainer, OPND_CONTAINER_HIDDEN_VIDEO_LIST_ITEM);
            setVisible(opndContainer, false);
        }
    }
}

/**
 *
 * The video list item container is the one right below the video list container
 *
 * Video card divs:
 * <div class="tw-tower tw-tower--gutter-sm tw-tower--300 tw-flex-wrap">
 *     <div data-a-target="video-tower-card-1" class="tw-mg-b-2">
 *         <div>
 *             <div class="tw-card relative"> ... </div>
 *         </div>
 *     </div>
 * </div>
 *
 * or
 *
 * <div class="tw-tower tw-tower--gutter-sm tw-tower--300 tw-flex-wrap">
 *     <div>
 *         <div class="tw-card relative"> ... </div>
 *     </div>
 * </div>
 *
 * @param videoCardDiv {!HTMLDivElement}
 * @return {Node}
 */
function getVideoListItemContainer(videoCardDiv) {
    let videoListContainerFound = false;
    let currentParent = videoCardDiv;
    let currentChild = null;
    while (!currentParent.classList.contains(TWITCH_VIDEO_LIST_CONTAINER_CLASS)) {
        currentChild = currentParent;
        currentParent = currentParent.parentNode;
        if (currentParent == null) {
            warn("Could not find video card container: Could not find video list container (.%s)", TWITCH_VIDEO_LIST_CONTAINER_CLASS);
            break;
        }
    }
    return currentChild;
}

/**
 *
 * @param videoCardDiv {!HTMLDivElement}
 * @param visible {!boolean}
 */
function setHiddenVideoListItemVisible(videoCardDiv, visible) {
    const videoCardContainer = getVideoListItemContainer(videoCardDiv);
    const opndContainer = getOpndContainer(videoCardContainer, OPND_CONTAINER_HIDDEN_VIDEO_LIST_ITEM);
    if (opndContainer != null) {
        setVisible(opndContainer, visible);
    }
}

function setAllHiddenVideoListItemsVisible(visible) {
    setAllVisible(document.getElementsByClassName(OPND_CONTAINER_HIDDEN_VIDEO_LIST_ITEM), visible);
}


/**
 * The video list item toolbar is injected in the container where the title is in.
 *
 * Injection container:
 *
 * <div class="tw-overflow-hidden tw-flex tw-flex-column">
 *     <div class="opnd-video-list-item-toolbar">
 *         <button title="Hide title"><img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/hide_title_grey.svg"></button>
 *         <button title="Hide preview"><img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/hide_preview_grey.svg"></button>
 *         <button title="Show duration"><img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/show_duration_grey.svg"></button>
 *     </div>
 *     <div data-test-selector="video-title" class="tw-overflow-hidden tw-relative">
 *         <p class="tw-c-text tw-line-height-heading tw-font-size-5 ">
 *             <span class="opnd-container opnd-container-video-list-item-title">
 *                 <a class="video-preview-card__video-title" title="Watchpoint: Recap Edition | Stage 3 Week 1" data-a-target="video-preview-card-title-link" href="/videos/248664471">Watchpoint: Recap Edition | Stage 3 Week 1</a>
 *             </span>
 *         </p>
 *     </div>
 *     <div class="tw-ellipsis tw-flex-grow-0 tw-flex-shrink-0">
 *         <span class="tw-ellipsis tw-c-text-alt-2 " title="Apr 10, 2018 · OverwatchLeague">Apr 10, 2018<span class="tw-pd-x-05">·</span><a class="video-preview-card__owner-display-name" data-a-target="video-preview-card-channel-link" data-test-selector="video-owner" title="OverwatchLeague" href="/overwatchleague">OverwatchLeague</a></span>
 *     </div>
 * </div>
 *
 * @param videoCardDiv {!Element} the video card div in which the toolbar should be added
 * @returns {?Element} the toolbar if it could be added
 */
function injectVideoListItemToolbar(videoCardDiv) {
    let toolbarElem = videoCardDiv.querySelector("." + OPND_VIDEO_LIST_ITEM_TOOLBAR_CLASS);
    if (!toolbarElem) {
        const injectionContainerChild = videoCardDiv.querySelector("div[data-test-selector='video-title']");
        if (injectionContainerChild) {
            toolbarElem = buildVideoListItemToolbar(videoCardDiv);
            injectionContainerChild.parentNode.insertBefore(toolbarElem, injectionContainerChild);
        }
    }
    return toolbarElem;
}

function getVideoTitleOpndContainers(videoCardDiv = null) {
    return getOrWrapSuppliedInOpndContainers(() => getVideoTitleAnchors(videoCardDiv), OPND_CONTAINER_VIDEO_LIST_ITEM_TITLE_CLASS);
}

function getVideoPreviewOpndContainers(videoCardDiv = null) {
    return getOrWrapSuppliedInOpndContainers(() => getVideoPreviewDivs(videoCardDiv), OPND_CONTAINER_VIDEO_LIST_ITEM_PREVIEW_CLASS);
}

function getVideoDurationOpndContainers(videoCardDiv = null) {
    return getOrWrapSuppliedInOpndContainers(() => getVideoLengthDivs(videoCardDiv), OPND_CONTAINER_VIDEO_LIST_ITEM_DURATION_CLASS);
}

/**
 *
 * @param videoCardDiv
 * @return {?String}
 */
function getVideoTitle(videoCardDiv) {
    const videoTitleAnchors = getVideoTitleAnchors(videoCardDiv);
    if (videoTitleAnchors.length < 0) {
        //warn("Could not get video title: No video title anchors found in: %o", videoCardDiv);
        return null;
    }
    const videoTitleAnchor = videoTitleAnchors[0];
    if (!videoTitleAnchor) {
        //warn("Could not get video title: First video title anchor is invalid: %o", videoCardDiv);
        return null;
    }
    return videoTitleAnchor.title;
}

/**
 * Video title div:
 * <div data-test-selector="video-title" class="overflow-hidden relative">
 *      <p class="c-text font-size-5">
 *          <a class="video-preview-card__video-title" title="!RED Mickie | Dallas Fuel | EN-TH" data-a-target="video-preview-card-title-link" href="/videos/206218321">!RED Mickie | Dallas Fuel | EN-TH</a>
 *     </p>
 * </div>
 *
 * @param videoCardDiv {?Element} the video card div to use for the query root or null to use the document
 * @returns {!NodeListOf<!HTMLAnchorElement>}
 */
function getVideoTitleAnchors(videoCardDiv = null) {
    const queryRoot = videoCardDiv ? videoCardDiv : document;
    return queryRoot.querySelectorAll("a[data-a-target='video-preview-card-title-link']");
}

/**
 * Video preview div:
 * <div class="video-preview-card__image-wrapper" data-test-selector="preview-image-wrapper">
 *      <figure class="flex-shrink-0">
 *          <figure class="tw-aspect tw-aspect--16x9 tw-aspect--align-top">
 *              <img alt="!RED Mickie | Dallas Fuel | TH-EN" class="video-preview-card__preview-image" data-test-selector="preview-image" src="https://static-cdn.jtvnw.net/s3_vods/179fedfa3031185e4302_mickiepp_26871265136_748124242/thumb/thumb0-320x180.jpg">
 *          </figure>
 *      </figure>
 * </div>
 *
 * @param videoCardDiv {?Element} the video card div to use for the query root or null to use the document
 * @returns {!NodeListOf<!HTMLDivElement>}
 */
function getVideoPreviewDivs(videoCardDiv = null) {
    const queryRoot = videoCardDiv ? videoCardDiv : document;
    return queryRoot.querySelectorAll("div[data-test-selector='preview-image-wrapper']");
}

/**
 * Video duration div (length):
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
 * @param videoCardDiv {?Element} the video card div to use for the query root or null to use the document
 * @returns {!Array.<!Element>}
 */
function getVideoLengthDivs(videoCardDiv = null) {
    const videoLengthStatDivs = [];
    const queryRoot = videoCardDiv ? videoCardDiv : document;
    const videoStatDivs = queryRoot.getElementsByClassName("video-preview-card__preview-overlay-stat");
    if (videoStatDivs.length > 0) {
        for (let i = 0; i < videoStatDivs.length; ++i) {
            const videoStatDiv = videoStatDivs[i];
            const videoLengthDiv = videoStatDiv.querySelector("div[data-test-selector='video-length']");
            if (videoLengthDiv) {
                videoLengthStatDivs.push(videoStatDiv);
            }
        }
    }
    return videoLengthStatDivs;
}

/**
 *
 * Video channel anchor:
 * <a class="video-preview-card__owner-display-name" data-a-target="video-preview-card-channel-link" data-test-selector="video-owner" title="xQcOW" href="/xqcow">xQcOW</a>
 *
 * @param videoCardDiv
 * @return {?Channel} the channel if it can be determined
 */
function getVideoChannel(videoCardDiv) {
    const channelAnchor = videoCardDiv.querySelector("a[data-test-selector='video-owner']");
    if (channelAnchor) {
        const channel = TWITCH_PLATFORM.parseChannelFromUrl(channelAnchor);
        channel.displayName = channelAnchor.textContent;
        return channel;
    }
    return null;
}

/**
 *
 * @param videoCardDiv {?Element} the video card div if toolbars should only be removed inside this dive or null to remove all
 */
function removeVideoListItemToolbars(videoCardDiv = null) {
    const queryRoot = videoCardDiv ? videoCardDiv : document;
    removeElements(queryRoot.getElementsByClassName(OPND_VIDEO_LIST_ITEM_TOOLBAR_CLASS));
}

/**
 *
 *  Video List Items are added asynchronlously to the video list item tower if the user scrolls down.
 *  So we have to listen for that and then trigger a reconfiguration
 *
 * Video List Item Tower:
 * <div class="tw-tower tw-tower--gutter-sm tw-tower--240">...</div>
 *
 *
 */
function observeVideoListItemsAdded() {
    if (GLOBAL_videoListObservers.length > 0) {
        return;
    }

    const videoListContainers = document.getElementsByClassName(TWITCH_VIDEO_LIST_CONTAINER_CLASS);
    for (let i = 0; i < videoListContainers.length; i++) {
        const videoListContainer = videoListContainers[i];
        const observer = new MutationObserver(function (mutations) {
            log("Detected video list mutations");
            let elementsAdded = false;
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Only nodes that are not opnd-containers are counted as added nodes.
                    // opnd-containers are added in the process of wrapping video list items and this must not trigger
                    // the reconfiguration again.
                    for (let j = 0; j < mutation.addedNodes.length; j++) {
                        const addedNode = mutation.addedNodes[j];
                        if (!addedNode.classList.contains(OPND_CONTAINER_CLASS)) {
                            elementsAdded = true;
                            break;
                        }
                    }
                }
            }
            if (elementsAdded) {
                log("Detected async added videos");
                resetGlobalPageChangedTime();
                setConfigured(OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME, false);
                setConfigured(OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME, false);
                setConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME, false);
                // TODO: We should only configure the added video list items and not all video list items (including the already configured and maybe the ones that were customized by the user).
                // Right now, once we configure all items, the visible states of hideable elements are reset (so changes that the user made on the page will be reset).
                configureVideoListItems();
            }
        });

        const config = {
            childList: true // Set to true if additions and removals of the target node's child elements (including text nodes) are to be observed.
        };

        // Observe the video list container for child additions
        observer.observe(videoListContainer, config);

        GLOBAL_videoListObservers.push(observer);

        log("Added observer to video list [%o]", videoListContainer);
    }
    log("Observing %s video lists for new videos being added", GLOBAL_videoListObservers.length)
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
    if (innerHtml.indexOf("xlink:href='#icon_theatre_deactivate'") !== -1) {
        return true;
    }
    else if (innerHtml.indexOf("xlink:href='#icon_theatre'") !== -1) {
        return false;
    }
    warn("Could not determine if Theatre Mode is active");
    return false;
}


/*
 * ====================================================================================================
 * BUILD PLAYER TOOLBAR
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
    const jumpBackwardBtn = buildPlayerToolbarButton(OPND_PLAYER_JUMP_BACKWARD_BTN_ID, handlePlayerJumpBackwardAction, OPND_PLAYER_JUMP_BACKWARD_TOOLTIP_SPAN_ID, "player_jumpBackward", null, "img/jump_backward_white.svg");
    toolbar.appendChild(jumpBackwardBtn);

    // Build "Jump Distance" text input
    const jumpDistanceInput = document.createElement("input");
    jumpDistanceInput.type = "text";
    jumpDistanceInput.id = OPND_PLAYER_JUMP_DISTANCE_INPUT_ID;
    jumpDistanceInput.pattern = DURATION_PATTERN;
    jumpDistanceInput.title = chrome.i18n.getMessage("player_jump_help");
    jumpDistanceInput.oninput = updateJumpButtonsAfterJumpDistanceChange;
    jumpDistanceInput.onkeyup = handleJumpDistanceInputKeyUpEvent;
    jumpDistanceInput.onmousewheel = handleJumpDistanceInputMouseWheelEvent;
    toolbar.appendChild(jumpDistanceInput);

    // Build "Jump Forward" button
    const jumpForwardBtn = buildPlayerToolbarButton(OPND_PLAYER_JUMP_FORWARD_BTN_ID, handlePlayerJumpForwardAction, OPND_PLAYER_JUMP_FORWARD_TOOLTIP_SPAN_ID, "player_jumpForward", null, "img/jump_forward_white.svg");
    toolbar.appendChild(jumpForwardBtn);

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
 * BUILD VIDEO LIST ITEM TOOLBAR
 * ====================================================================================================
 */

/**
 *
 * <div class="opnd-video-list-item-toolbar">
 *     <button title="Hide title">
 *         <img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/title_grey.svg">
 *     </button>
 *     <button title="Show preview">
 *         <img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/preview_grey.svg">
 *     </button>
 *     <button title="Hide duration">
 *         <img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/duration_grey.svg">
 *     </button>
 * </div>
 *
 * @param videoCardDiv
 * @return {HTMLDivElement}
 */
function buildVideoListItemToolbar(videoCardDiv) {
    const setTitleVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME];
    const setPreviewVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME];
    const setDurationVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME];

    const toolbarElem = document.createElement("div");
    toolbarElem.classList.add(OPND_VIDEO_LIST_ITEM_TOOLBAR_CLASS);

    // Title
    const showHideTitleBtn = buildVideoListItemToolbarButton(videoCardDiv, OPND_CONTAINER_VIDEO_LIST_ITEM_TITLE_CLASS, "img/hide_title_grey.svg", "videoListItem_showHideTitle_visible", "img/show_title_grey.svg", "videoListItem_showHideTitle_hidden", setTitleVisible);
    toolbarElem.appendChild(showHideTitleBtn);

    // Preview
    const showHidePreviewBtn = buildVideoListItemToolbarButton(videoCardDiv, OPND_CONTAINER_VIDEO_LIST_ITEM_PREVIEW_CLASS, "img/hide_preview_grey.svg", "videoListItem_showHidePreview_visible", "img/show_preview_grey.svg", "videoListItem_showHidePreview_hidden", setPreviewVisible);
    toolbarElem.appendChild(showHidePreviewBtn);

    // Duration
    const showHideDurationBtn = buildVideoListItemToolbarButton(videoCardDiv, OPND_CONTAINER_VIDEO_LIST_ITEM_DURATION_CLASS, "img/hide_duration_grey.svg", "videoListItem_showHideDuration_visible", "img/show_duration_grey.svg", "videoListItem_showHideDuration_hidden", setDurationVisible);
    toolbarElem.appendChild(showHideDurationBtn);

    return toolbarElem;
}

/**
 * <button title="Hide title">
 *     <img src="chrome-extension://nelphjignnodkaellhbmnbmlfjppbbdo/img/title_grey.svg">
 * </button>
 *
 * @param videoCardDiv {!HTMLDivElement} the video card div element
 * @param hideableContainerClass {!string}
 * @param visibleImgSrc {!string}
 * @param visibleTooltipMsg {!string}
 * @param hiddenImgSrc {!string}
 * @param hiddenTooltipMsg {!string}
 * @param initialVisible {!boolean}
 * @returns {!HTMLButtonElement}
 */
function buildVideoListItemToolbarButton(videoCardDiv, hideableContainerClass, visibleImgSrc, visibleTooltipMsg, hiddenImgSrc, hiddenTooltipMsg, initialVisible) {
    const btn = document.createElement("button");
    btn.onclick = () => {
        const setVisibleResult = setAllVisible(videoCardDiv.getElementsByClassName(hideableContainerClass), null);
        updateVideoListItemToolbarShowHideTooltip(btn, setVisibleResult, visibleImgSrc, visibleTooltipMsg, hiddenImgSrc, hiddenTooltipMsg);
        // TODO: NOT ACTUALLY DO THE NEXT LINE, instead add a toggle button somewhere
        setAllHiddenVideoListItemsVisible(setVisibleResult);
    };

    // Build img
    const img = document.createElement("img");
    btn.appendChild(img);

    // Execute one time to initially set the button tooltip text
    updateVideoListItemToolbarShowHideTooltip(btn, initialVisible, visibleImgSrc, visibleTooltipMsg, hiddenImgSrc, hiddenTooltipMsg);

    return btn;
}

function updateVideoListItemToolbarShowHideTooltip(button, visible, visibleImgSrc, visibleTooltipMsg, hiddenImgSrc, hiddenTooltipMsg) {
    const img = button.getElementsByTagName("img")[0];
    if (visible === true) {
        img.src = chrome.runtime.getURL(visibleImgSrc);
        button.title = chrome.i18n.getMessage(visibleTooltipMsg);
    } else if (visible === false) {
        img.src = chrome.runtime.getURL(hiddenImgSrc);
        button.title = chrome.i18n.getMessage(hiddenTooltipMsg);
    }
}


/*
 * ====================================================================================================
 * ACTION HANDLING
 * ====================================================================================================
 */
function handlePlayerShowHideDurationAction() {
    log("Handling action [Player: Show/Hide Duration]");

    // Toggle
    updatePlayerDurationVisibleAndShowHideButton(false, null);
}

/**
 *
 * @param wheelEvent {!WheelEvent}
 */
function handleJumpDistanceInputMouseWheelEvent(wheelEvent) {
    wheelEvent.preventDefault();

    let direction = 0;
    if (wheelEvent.wheelDelta > 0) {
        direction = 1;
    }
    else if (wheelEvent.wheelDelta < 0) {
        direction = -1;
    }
    spinPlayerJumpDistance(direction);
}

/**
 *
 * @param keyboardEvent {!KeyboardEvent}
 */
function handleJumpDistanceInputKeyUpEvent(keyboardEvent) {
    keyboardEvent.preventDefault();

    /*
     * - Enter: Forward jump
     * - Shift+Enter: Backwards jump
     * - ArrowUp Spin up
     * - ArrowDown: Spin down
     */
    if (keyboardEvent.key === "Enter") {
        if (keyboardEvent.shiftKey) {
            playerJump(-1);
        } else {
            playerJump(1);
        }
    } else if (keyboardEvent.key === "ArrowUp") {
        spinPlayerJumpDistance(1);
    } else if (keyboardEvent.key === "ArrowDown") {
        spinPlayerJumpDistance(-1);
    }
}

/**
 *
 * @param direction {!number} 1 for forward or -1 for backward
 */
function spinPlayerJumpDistance(direction) {
    if (direction === 0) {
        return;
    }
    const jumpDistanceInput = document.getElementById(OPND_PLAYER_JUMP_DISTANCE_INPUT_ID);
    const jumpDistance = parseDuration(jumpDistanceInput.value);

    let newJumpDistance;
    if (direction > 0) { // spin up
        if (jumpDistance < 5) { // < 5s -> 5s
            newJumpDistance = 5;
        } else if (jumpDistance < 30) { // < 30s -> 30s
            newJumpDistance = 30;
        } else { // >= 30s -> next full minute
            newJumpDistance = Math.ceil(jumpDistance / 60) * 60;
            if (newJumpDistance === jumpDistance) {
                newJumpDistance += 60;
            }
        }
    } else { // spin down
        if (jumpDistance <= 30) { // <= 30s -> 5s
            newJumpDistance = 5;
        } else if (jumpDistance <= 60) { // <= 1m -> 30s
            newJumpDistance = 30;
        } else { // > 1m -> previous full minute
            newJumpDistance = Math.floor(jumpDistance / 60) * 60;
            if (newJumpDistance === jumpDistance) {
                newJumpDistance -= 60;
            }
        }
    }

    const newJumpDistanceInputValue = formatDuration(newJumpDistance, false);
    jumpDistanceInput.value = newJumpDistanceInputValue;

    // Trigger the change event manually because programmatic changes do not trigger an input event
    updateJumpButtonsAfterJumpDistanceChange();
}

function handlePlayerJumpBackwardAction() {
    log("Handling action [Player: Jump Backward]");
    playerJump(-1);
}

function handlePlayerJumpForwardAction() {
    log("Handling action [Player: Jump Forward]");
    playerJump(1);
}

/**
 *
 * @param direction {!number} 1 for forward or -1 for backward
 */
function playerJump(direction) {
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
    const distanceInputValue = document.getElementById(OPND_PLAYER_JUMP_DISTANCE_INPUT_ID).value;
    // distance is an absolute value
    const distance = parseDuration(distanceInputValue);
    if (distance === 0) {
        log("Time jump failed: No valid jump distance given: %s", distanceInputValue);
        return;
    }

    // Add/Subtract the jump distance to/from the current time (but require: minTime <= newTime <= maxTime)
    const newTime = Math.min(maxTime, Math.max(minTime, currentTime + distance * direction));
    /**
     *     Can be negative (for jumping backwards) or positive (for jumping forward)
     */
    const actualDistance = newTime - currentTime;
    const absActualDistance = Math.abs(actualDistance);

    playerJumpWithRapidSeeking(actualDistance, currentTime, newTime);

    // TODO: Is this (or with a different threshold) still needed?
    // For jumps <= 2m (120s), use rapid seeking
    // For jumps over 2m, use the location changing jump as rapid seeking takes to long
    /*
    if (absActualDistance <= 120) {
        playerJumpWithRapidSeeking(actualDistance, currentTime, newTime);
    } else {
        playerJumpWithLocationChange(actualDistance, currentTime, newTime);
    }
    */
}

function playerJumpWithRapidSeeking(distance, currentTime, newTime) {
    const playerElem = document.querySelector("." + TWITCH_PLAYER_CLASS);
    const keyEvent = new KeyboardEvent("keydown", {
        bubbles: false,
        cancelable: false,
        key: distance < 0 ? "ArrowLeft" : "ArrowRight",
        repeat: true,
    });

    // One arrow button push equals 5 seconds of seeking
    const numArrowSeeks = Math.ceil(Math.abs(distance) / 5);

    log("Jumping %is: %is -> %is (using %i arrow seeks)", distance, currentTime, newTime, numArrowSeeks);

    for (let i = 0; i < numArrowSeeks; i++) {
        playerElem.dispatchEvent(keyEvent);
    }
}

/**
 * @deprecated seems like the rapid seeking option is better (it works quickly right now ({@link playerJumpWithRapidSeeking}
 *
 * @param distance
 * @param currentTime
 * @param newTime
 */
function playerJumpWithLocationChange(distance, currentTime, newTime) {
    // Build the new url
    const newTimeUrl = buildCurrentUrlWithTime(newTime);
    log("Jumping %is: %is -> %is (new location: %s)", distance, currentTime, newTime, newTimeUrl);
    window.location.assign(newTimeUrl);
}

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


function cleanPage() {
    log("Cleaning page after page change");
    setAllVisible(null, true);

    removePlayerToolbarAndShowPlayerDuration();
    removeVideoListItemToolbars();
}

/*
 * ====================================================================================================
 * MESSAGE HANDLING
 * ====================================================================================================
 */
function listenForMessages() {
    chrome.runtime.onMessage.addListener(handleMessage);
}

function signalTabInfoChanged(changedProperty) {
    GLOBAL_tabInfoChanged = true;
    log("TabInfo update needs to be sent because [%s] changed", changedProperty);
}

function resetTabInfoChanged() {
    GLOBAL_tabInfoChanged = false;
}

/**
 * @return {!TabInfoMessage} the tab info message
 */
function buildTabInfoMessage() {
    return new TabInfoMessage(new TabInfo(TWITCH_PLATFORM.serialize(), GLOBAL_channel ? GLOBAL_channel.serialize() : null, GLOBAL_sfmState));
}

function sendTabInfoMessage() {
    if (GLOBAL_tabInfoChanged) {
        const tabInfoMsg = buildTabInfoMessage();
        opnd.browser.sendMessage(tabInfoMsg).catch((error) => {
            // ignore: is logged anyway
        });
        resetTabInfoChanged();
    }
}

/**
 *
 * @param request {!Message} the message
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(request, sender, sendResponse) {
    log("Received message from [%o]: %o", sender, request);
    if (MessageType.TAB_INFO_REQUEST === request.type) {
        const tabInfoMessage = buildTabInfoMessage();
        log("Responding to [Message:" + MessageType.TAB_INFO_REQUEST + "] with: %o", tabInfoMessage);
        sendResponse(tabInfoMessage);
    }
}


/*
 * ====================================================================================================
 * OPTIONS
 * ====================================================================================================
 */
function listenForStorageChanges() {
    chrome.storage.onChanged.addListener(handleStorageChange);
}

function handleStorageChange(changes, namespace) {
    log("[%s storage] Storage changes: %o", namespace, changes);
    for (const key in changes) {
        GLOBAL_options[key] = changes[key].newValue;
    }
    reconfigurePageAfterOptionsUpdate(mapOptionChangesToItems(changes));
}


function reconfigurePageAfterOptionsUpdate(changedOptions) {
    resetGlobalPageStateFlags(changedOptions);
    configurePage();
}


/*
 * ====================================================================================================
 * INIT
 * ====================================================================================================
 */
function init() {
    log("Initializing on %s...", document.location.href);

    resetGlobalPageFlags();
    determinePageType();

    opnd.browser.readOptions().then((items) => {
        GLOBAL_options = items;
        reconfigurePageAfterOptionsUpdate(GLOBAL_options);

        listenForStorageChanges();
        listenForMessages();
        startCheckPageTask();
    });
}

init();
