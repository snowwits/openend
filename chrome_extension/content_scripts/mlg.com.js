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
let GLOBAL_sfmEnabledForPage = SfmEnabledState.UNDETERMINED;
/**
 * Flags whether the dependencies of certain options have been configured yet
 */
let GLOBAL_configuredFlags = getDefaultConfiguredFlagsCopy();


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

    resetGlobalPageStateFlags(GLOBAL_options)
}

function resetGlobalPageStateFlags(changedOptions) {
    // If something about SFM enabled changed, sfmEnabledForPage needs re-determination.
    if (OPT_SFM_ENABLED_NAME in changedOptions) {
        updateSfmEnabledForPage(SfmEnabledState.UNDETERMINED);
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
            }
            else {
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
    determineSfmEnabledForPage();
    configurePlayer();
    configureVideoListItems();
}

function isPageConfigured() {
    return isSfmEnabledForPageDetermined() && isPlayerConfigured() && isVideoListItemsConfigured();
}

function formatPageConfigurationState() {
    return `sfmEnabledForPageDetermined: ${isSfmEnabledForPageDetermined()}, playerConfigured: ${isPlayerConfigured()}`;
}


/*
 * ====================================================================================================
 * CONFIGURATION: SfmEnabledForPage
 * ====================================================================================================
 */
function determineSfmEnabledForPage() {
    if (isSfmEnabledForPageDetermined()) {
        return;
    }

    // Only if SfmEnabled.ALWAYS, as MLG has no channels
    let sfmEnabledForPage;
    if (SfmEnabled.ALWAYS === GLOBAL_options[OPT_SFM_ENABLED_NAME]) {
        sfmEnabledForPage = SfmEnabledState.ENABLED;
    } else {
        sfmEnabledForPage = SfmEnabledState.DISABLED
    }
    updateSfmEnabledForPage(sfmEnabledForPage);
}


function isSfmEnabledForPageDetermined() {
    return SfmEnabledState.UNDETERMINED !== GLOBAL_sfmEnabledForPage;
}

function isSfmEnabledForPage() {
    return SfmEnabledState.ENABLED === GLOBAL_sfmEnabledForPage;
}

function isSfmDisabledForPage() {
    return SfmEnabledState.DISABLED === GLOBAL_sfmEnabledForPage;
}

function updateSfmEnabledForPage(sfmEnabledForPage) {
    const isChange = GLOBAL_sfmEnabledForPage !== sfmEnabledForPage;

    // If the sfmEnabledForPage changed, SFM dependencies need reconfiguration
    if (isChange) {
        GLOBAL_sfmEnabledForPage = sfmEnabledForPage;
        log("Updated [sfmEnabledForPage] to [%o]", GLOBAL_sfmEnabledForPage);

        setSfmOptionsToNotConfigured();
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
        if (isSfmEnabledForPage()) {
            setDurationVisible = !GLOBAL_options[OPT_SFM_PLAYER_HIDE_DURATION_NAME];
        }
        else {
            setDurationVisible = true;
        }
        const opndContainers = getOrWrapAllInOpndContainers(durationElements);
        setAllVisible(opndContainers, setDurationVisible);
        setConfigured(OPT_SFM_PLAYER_HIDE_DURATION_NAME, true)
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
 * <div data-v-c420a302="" class="md-card-content">
 *     <div data-v-c420a302="" class="card-row">
 *         <div data-v-c420a302="" class="title">Overwatch League Preseason Day 1 Highlights</div>
 *         <div data-v-c420a302="" class="info">17 minutes ago&nbsp;&nbsp;·&nbsp;&nbsp;4:03</div>
 *         <div data-v-c420a302="" class="subhead">Check out the best moments of Day 1 and tune into MLG for Day 2, broadcasting live at 2 pm (EST).</div>
 *     </div>
 *     <div data-v-c420a302="" class="card-row">
 *         <div data-v-c420a302="" class="card-cell"></div>
 *     </div>
 * </div>
 */
function configureVideoListItems() {
    console.log(formatFrameType() + ": Configuring video list items");
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
    // Search for the inner containers
    const existingMlgOpndInnerContainers = document.querySelectorAll(".md-card-content .info ." + OPND_INNER_CONTAINER_CLASS);
    if (existingMlgOpndInnerContainers.length > 0) {
        opndContainers = existingMlgOpndInnerContainers;
    } else {
        const mlgInfoSpans = document.querySelectorAll(".md-card-content .info");
        if (mlgInfoSpans.length > 0) {
            const newOpndInnerContainers = [];
            for (let i = 0; i < mlgInfoSpans.length; i++) {
                const mlgInfoSpan = mlgInfoSpans[i];
                const innerHtmlValue = mlgInfoSpan.innerHTML;
                const indexOfPoint = innerHtmlValue.indexOf("·");
                const dateHtmlValue = innerHtmlValue.substring(0, indexOfPoint+1);
                const durationHtmlValue = innerHtmlValue.substring(indexOfPoint+1);
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
        if (isSfmEnabledForPage()) {
            setDurationVisible = !GLOBAL_options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME];
        }
        else {
            setDurationVisible = true;
        }
        setAllVisible(opndContainers, setDurationVisible);
        setConfigured(OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME, true)
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

/**
 * @return TabInfoMessage
 */
function buildTabInfoMessage() {
    return {
        [MSG_TYPE_NAME]: MSG_TYPE_TAB_INFO,
        [MSG_BODY_NAME]: {
            [TAB_INFO_PLATFORM_NAME]: MLG_PLATFORM.name
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

    chrome.storage.sync.get(getDefaultOptionsCopy(), function (items) {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to get options: %o", chrome.runtime.lastError);
            return;
        }
        GLOBAL_options = items;
        log("Loaded options: %o", GLOBAL_options);

        listenForOptionsChanges();
        // Only the top frame should answer messages
        if (isTopFrame()) {
            listenForMessages();
        }
        startCheckPageTask();
    });
}

init();