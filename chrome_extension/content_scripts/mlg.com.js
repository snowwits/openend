/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function log(msg, ...substitutions) {
    logWithComponent("content_script-mlg-" + formatFrameType(), msg, ...substitutions);
}

function warn(msg, ...substitutions) {
    warnWithComponent("content_script-mlg-" + formatFrameType(), msg, ...substitutions);
}

function error(msg, ...substitutions) {
    errorWithComponent("content_script-mlg-" + formatFrameType(), msg, ...substitutions);
}


/*
 * ====================================================================================================
 * CONSTANTS
 * ====================================================================================================
 */


/*
 * ====================================================================================================
 * GLOBAL FLAGS
 * ====================================================================================================
 */
/* Variables that only need to be changed after a page change */
let GLOBAL_elementsLoadedTimeoutReached = false;
/**
 *
 * @type {?string} {@link MlgPageType}
 */
let GLOBAL_pageType = null;

/* Variables that can change at any given time */
/**
 * Options can change at any time (when the user changes the options).
 */
let GLOBAL_options = getDefaultOptionsCopy();


/* Variables that need to be changed after options change */
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
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: false
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
    GLOBAL_elementsLoadedTimeoutReached = false;

    resetGlobalPageStateFlags(GLOBAL_options);
}

function resetGlobalPageStateFlags(changedOptions) {
    // If something about SFM enabled changed, sfmState needs re-determination.
    // Also, all SFM dependencies need reconfiguration (they may be independent from sfmState, for example video list items on a directory/game/Overwatch page can be from several channels).
    if (containsSfmEnabledOption(changedOptions)) {
        updateSfmState(null);
        determineSfmState();

        setSfmOptionsToNotConfigured();
    }

    // All changed options need redetermination
    for (let optionName in GLOBAL_configuredFlags) {
        if (optionName in changedOptions) {
            setConfigured(optionName, false);
        }
    }
}

function determinePageType() {
    const pageTypeResult = MLG_PLATFORM.parsePageFromUrl(window.location);
    if (pageTypeResult) {
        GLOBAL_pageType = pageTypeResult.pageType;
    }
    log("Page type: %s", GLOBAL_pageType);
}

function startCheckPageTask() {
    let pageChangedTime = Date.now();

    const constCheckPageTask = function () {
        // As long as the time out hasn't been reached, periodically try to configure the page
        if (!GLOBAL_elementsLoadedTimeoutReached) {
            const checkTime = Date.now();
            if (checkTime - pageChangedTime < PAGE_CONFIGURATION_TIMEOUT) {
                configurePage();
            } else {
                GLOBAL_elementsLoadedTimeoutReached = true;
                if (!isPageConfigured()) {
                    log("Elements loaded timeout reached (%d ms). Some components may not be configured. Configuration state: %o", PAGE_CONFIGURATION_TIMEOUT, formatPageConfigurationState());
                }
            }
        }
    };

    // Execute task now and repeatedly after that
    constCheckPageTask();
    setInterval(constCheckPageTask, CHECK_PAGE_TASK_INTERVAL);
}

function configurePage() {
    if (isPageConfigured()) {
        return;
    }
    determineSfmState();
    configurePlayer();
    configureVideoListItems();
    sendTabInfoMessage();
}

function isPageConfigured() {
    return isSfmStateDetermined() && isPlayerConfigured() && isVideoListItemsConfigured();
}

function formatPageConfigurationState() {
    return `sfmEnabledForPageDetermined: ${isSfmStateDetermined()}, playerConfigured: ${isPlayerConfigured()}`;
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
    updateSfmState(checkSfmState(GLOBAL_options, MLG_PLATFORM, null));
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
/**
 * Progress/Seek bar:
 * <div id="mlg-progress-bar-container" style="display: block; visibility: visible; opacity: 1;"> ... </div>
 *
 * Duration span:
 * <span id="mlg-time-duration">8:26:15</span>
 */
function configurePlayer() {
    if (isPlayerConfigured()) {
        return;
    }

    const durationElements = [];
    const progressBarContainerDiv = document.getElementById("mlg-progress-bar-container");
    if (progressBarContainerDiv) {
        durationElements.push(progressBarContainerDiv);
    }
    const durationSpan = document.getElementById("mlg-time-duration");
    if (durationSpan) {
        durationElements.push(durationSpan);
    }
    if (durationElements.length > 0) {
        let setDurationVisible;
        if (isSfmStateActive()) {
            setDurationVisible = !GLOBAL_options[OPT_SFM_PLAYER_HIDE_DURATION_NAME];
        } else {
            setDurationVisible = true;
        }
        const opndContainers = getOrWrapAllInOpndContainers(durationElements);
        setAllVisible(opndContainers, setDurationVisible);
        setConfigured(OPT_SFM_PLAYER_HIDE_DURATION_NAME, true);
    }
}

function isPlayerConfigured() {
    return isPlayerDurationConfigured();
}


function isPlayerDurationConfigured() {
    return GLOBAL_pageType !== MlgPageType.IFRAME_PLAYER || isConfigured(OPT_SFM_PLAYER_HIDE_DURATION_NAME);
}


/**
 * overwatchleague.com
 *
 * Duration:
 * <span class="Card-timecode">27:04</span>
 *
 * On mlg.com
 * Duration:
 * @example
 * <div data-v-0638f512="" class="card-tertiary">
 *     <div data-v-0638f512="" class="image-container">
 *         <img data-v-0638f512="" src="https://s3.amazonaws.com/mlg-image-resize/auto-resize-service/7MrNaTDeSjV/bc8f3321-5320-4c92-b80e-5c3a189e3b2a-480x270.jpeg?v=1547956087" alt="Watch Heretics Celebrate Qualifying for Pro League" class="vod-img"> <img data-v-0638f512="" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICAgIDxwYXRoIGZpbGw9IiNGRkYiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTE2IDMyQzcuMTYzIDMyIDAgMjQuODM3IDAgMTZTNy4xNjMgMCAxNiAwczE2IDcuMTYzIDE2IDE2LTcuMTYzIDE2LTE2IDE2em0tNC0yMC44MTN2OS42MjZjMCAuNjU2LjU0IDEuMTg3IDEuMjA4IDEuMTg3LjI1MiAwIC40OTctLjA3Ny43MDItLjIyMWw3LjU4NC00LjgxM2ExLjE3MyAxLjE3MyAwIDAgMCAwLTEuOTMxTDEzLjkxIDEwLjIyYTEuMjIyIDEuMjIyIDAgMCAwLTEuNjg1LjI3NiAxLjE3MiAxLjE3MiAwIDAgMC0uMjI1LjY5eiIvPgo8L3N2Zz4K" alt="" class="vod-play-btn"></div> <div data-v-0638f512="" class="content-container"><div data-v-0638f512="" class="title">Watch Heretics Celebrate Qualifying for Pro League</div>
 *         <div data-v-0638f512="" class="info">
 *             <span class="opnd-container opnd-inner-container">21 hours ago&nbsp;&nbsp;•&nbsp;&nbsp;1:03</span>
 *         </div>
 *         <div data-v-0638f512="" class="subhead">It was an emotional celebration, as Heretics stuck it out to clinch a Pro League spot.</div>
 *         <div data-v-0638f512="" class="tags-container">
 *             <a data-v-0638f512="" href="/game/call-of-duty" class="tag-link">
 *                 <button data-v-0638f512="">Call of Duty</button>
 *             </a>
 *         </div>
 *     </div>
 * </div>
 */
function configureVideoListItems() {
    if (isVideoListItemsConfigured()) {
        return;
    }
    // We can't wrap these spans because then they aren't shown at all, so we have to wrap their content
    let opndContainers = [];
    // On overwatchleague.com
    // Search for the inner containers
    const existingOwlOpndInnerContainers = document.querySelectorAll(".Card-timecode ." + OPND_INNER_CONTAINER_CLASS);
    if (existingOwlOpndInnerContainers.length > 0) {
        opndContainers = existingOwlOpndInnerContainers;
    } else {
        const durationSpans = document.getElementsByClassName("Card-timecode");
        if (durationSpans.length > 0) {
            const newOpndInnerContainers = [];
            for (let i = 0; i < durationSpans.length; i++) {
                const durationSpan = durationSpans[i];
                const innerHtmlValue = durationSpan.innerHTML;
                const innerContainer = document.createElement("span");
                innerContainer.classList.add(OPND_CONTAINER_CLASS, OPND_INNER_CONTAINER_CLASS);
                innerContainer.innerHTML = innerHtmlValue;
                durationSpan.innerHTML = "";
                durationSpan.appendChild(innerContainer);
                newOpndInnerContainers.push(innerContainer);
            }
            opndContainers = newOpndInnerContainers;
        }
    }

    // On MLG.com
    // On MLG.com the upload date and the duration are in one span, not differentiable DOM-wise
    // So we parse the text (e.g. "21 hours ago&nbsp;&nbsp;•&nbsp;&nbsp;1:03"),
    // insert a OpenEnd inner container around just the duration (everything after "•")
    // and hide that inner container if wanted.
    const existingMlgOpndInnerContainers = document.querySelectorAll(".card-tertiary .info ." + OPND_INNER_CONTAINER_CLASS);
    if (existingMlgOpndInnerContainers.length > 0) {
        opndContainers = existingMlgOpndInnerContainers;
    } else {
        const mlgInfoSpans = document.querySelectorAll(".card-tertiary .info");
        if (mlgInfoSpans.length > 0) {
            const newOpndInnerContainers = [];
            for (let i = 0; i < mlgInfoSpans.length; i++) {
                const mlgInfoSpan = mlgInfoSpans[i];
                const innerHtmlValue = mlgInfoSpan.innerHTML;
                const indexOfPoint = innerHtmlValue.indexOf("•");
                const dateHtmlValue = innerHtmlValue.substring(0, indexOfPoint + 1);
                const durationHtmlValue = innerHtmlValue.substring(indexOfPoint + 1);
                const innerContainer = document.createElement("span");
                innerContainer.classList.add(OPND_CONTAINER_CLASS, OPND_INNER_CONTAINER_CLASS);
                innerContainer.innerHTML = durationHtmlValue;
                mlgInfoSpan.innerHTML = dateHtmlValue;
                mlgInfoSpan.appendChild(innerContainer);
                newOpndInnerContainers.push(innerContainer);
            }
            opndContainers = newOpndInnerContainers;
        }
    }

    if (opndContainers.length > 0) {
        let setDurationVisible;
        if (isSfmStateActive()) {
            setDurationVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME];
        } else {
            setDurationVisible = true;
        }
        setAllVisible(opndContainers, setDurationVisible);
        setConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME, true);
    }
}

function isVideoListItemsConfigured() {
    return GLOBAL_pageType === MlgPageType.IFRAME_PLAYER || isConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME);
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
    return new TabInfoMessage(new TabInfo(MLG_PLATFORM.serialize(), null, GLOBAL_sfmState));
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
    log("[%s storage] Option changes: %o", namespace, changes);
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
    log("Initializing on %s... (%s)", document.location.href, formatFrameType());

    resetGlobalPageFlags();
    determinePageType();

    opnd.browser.readOptions().then((items) => {
        GLOBAL_options = items;
        reconfigurePageAfterOptionsUpdate(GLOBAL_options);

        listenForStorageChanges();
        // Only the top frame should answer messages
        if (isTopFrame()) {
            listenForMessages();
        }
        startCheckPageTask();
    });
}

init();