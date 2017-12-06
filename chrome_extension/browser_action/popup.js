/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function log(msg, ...substitutions) {
    logWithComponent("browser_action", msg, ...substitutions);
}

function warn(msg, ...substitutions) {
    warnWithComponent("browser_action", msg, ...substitutions);
}

function error(msg, ...substitutions) {
    errorWithComponent("browser_action", msg, ...substitutions);
}


/*
 * ====================================================================================================
 * CONSTANTS
 * ====================================================================================================
 */


/*
 * ====================================================================================================
 * FUNCTIONS
 * ====================================================================================================
 */
function readNecessaryOptions() {
    chrome.storage.sync.get({[OPT_SFM_ENABLED_NAME]: OPT_SFM_ENABLED_DEFAULT}, function (items) {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to get [%o]: %o", OPT_SFM_ENABLED_NAME, chrome.runtime.lastError);
            return;
        }
        log("[sync storage] Gotten options [%o]", items);

        updateUiAfterOptionsUpdate(items);
    });
}

/**
 *
 * @param tabInfo {?TabInfo}
 */
function updateUiAfterTabInfoUpdate(tabInfo) {
    log("Updating UI after tab info received: %o", tabInfo);

    // TODO: Show the platform on the popup and allow to enable/disable SFM for this platform (only if SfmEnabled.CUSTOM)
    // Platform
    //const platformText = tabInfo && TAB_INFO_PLATFORM_NAME in tabInfo ? tabInfo[TAB_INFO_PLATFORM_NAME] : TAB_INFO_PLATFORM_DEFAULT;
    //const platform = parsePlatformFromQualifiedName(platformText);


    // Channel
    const channelText = tabInfo && TAB_INFO_CHANNEL_NAME in tabInfo ? tabInfo[TAB_INFO_CHANNEL_NAME] : TAB_INFO_CHANNEL_DEFAULT;
    const channel = parseChannelFromQualifiedName(channelText);

    // First hide the elements
    const channelInfo = document.getElementById("channelInfo");
    channelInfo.classList.add(OPND_HIDDEN_CLASS);

    const channelElem = document.getElementById("channel");
    channelElem.dataset.channel = channelText;
    channelElem.textContent = channelText;

    const channelSfmEnabledCheckbox = document.getElementById("channelSfmEnabledCheckbox");
    channelSfmEnabledCheckbox.classList.add(OPND_HIDDEN_CLASS);

    const channelSpan = document.getElementById("channelLabel");
    if (channel !== null) {
        channelSpan.textContent = chrome.i18n.getMessage("browserAction_channel");
        channelInfo.classList.remove(OPND_HIDDEN_CLASS);

        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get [%o]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            log("[sync storage] Gotten %o", items);

            updateChannelSfmEnabledCheckbox(channelSfmEnabledCheckbox, channel.qualifiedName, items[OPT_SFM_CHANNELS_NAME]);
            channelSfmEnabledCheckbox.classList.remove(OPND_HIDDEN_CLASS);
        });
    } else {
        channelSpan.textContent = "";
    }
}

/**
 *
 * @param items {object} the options object
 */
function updateUiAfterOptionsUpdate(items) {
    // If the channels changed, may need to change the button mode and label
    if (OPT_SFM_CHANNELS_NAME in items) {
        const channelElem = document.getElementById("channel");
        const channelSfmEnabledCheckbox = document.getElementById("channelSfmEnabledCheckbox");
        const channelQualifiedName = channelElem.dataset.channel;
        updateChannelSfmEnabledCheckbox(channelSfmEnabledCheckbox, channelQualifiedName, items[OPT_SFM_CHANNELS_NAME]);
    }
    if (OPT_SFM_ENABLED_NAME in items) {
        setRadioValues("sfmEnabled", items[OPT_SFM_ENABLED_NAME]);
    }
}

/**
 *
 * @param channelSfmEnabledCheckbox {!Element} the checkbox
 * @param channelQualifiedName {!string} the qualified name of the current channel
 * @param sfmChannels {!Array.<string>} array qualified channel names (the {@link OPT_SFM_CHANNELS_NAME} option)
 */
function updateChannelSfmEnabledCheckbox(channelSfmEnabledCheckbox, channelQualifiedName, sfmChannels) {
    channelSfmEnabledCheckbox.checked = sfmChannels.includes(channelQualifiedName);
}

function handleSfmEnabledChanged() {
    // this: selected radio button
    const sfmEnabledValue = this.value;
    chrome.storage.sync.set({[OPT_SFM_ENABLED_NAME]: sfmEnabledValue}, function () {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_ENABLED_NAME, sfmEnabledValue, chrome.runtime.lastError);
            return;
        }
        log("[sync storage] Set option [%s] to [%o]", OPT_SFM_ENABLED_NAME, sfmEnabledValue);
    });
}

function handleChannelSfmEnabledChanged() {
    // this: channelSfmEnabledCheckbox
    const channelElem = document.getElementById("channel");
    const channelQualifiedName = channelElem.dataset.channel;

    const channelSfmEnabledCheckbox = this;

    if (channelQualifiedName && channelQualifiedName.length > 0) {
        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get option [%s]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            const channels = items[OPT_SFM_CHANNELS_NAME];
            let newChannels;
            if (channelSfmEnabledCheckbox.checked === true) {
                newChannels = sortedSetPlus(channels, channelQualifiedName);
            }
            else {
                newChannels = sortedSetMinus(channels, channelQualifiedName);
            }
            chrome.storage.sync.set({[OPT_SFM_CHANNELS_NAME]: newChannels}, function () {
                if (chrome.runtime.lastError) {
                    error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_CHANNELS_NAME, newChannels, chrome.runtime.lastError);
                    return;
                }
                log("[sync storage] Set option [%s] to [%o]", OPT_SFM_CHANNELS_NAME, newChannels);
            });
        });
    }
}

function sortedSetPlus(array, plusItem) {
    return Array.from(new Set(array).add(plusItem)).sort();
}

function sortedSetMinus(array, minusItem) {
    // Find item
    const indexOfItem = array.indexOf(minusItem);
    if (indexOfItem > -1) {
        // Make copy
        const newArray = array.slice();
        // Delete 1 element, starting from index
        newArray.splice(indexOfItem, 1);
        return newArray;
    }
    else {
        return array;
    }

}

function handleOpenOptionsAction() {
    chrome.runtime.openOptionsPage(() => {
        if (chrome.runtime.lastError) {
            error("Failed to open the options page: %s", chrome.runtime.lastError);
        }
    });
}

/**
 * Get the current URL.
 *
 * @param {function(Tab)} callback called when current tab is found
 */
function getCurrentTab(callback) {
    // Query filter to be passed to chrome.tabs.query - see https://developer.chrome.com/extensions/tabs#method-query
    const queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, (tabs) => {
        // chrome.tabs.query invokes the callback with a list of tabs that match the
        // query. When the popup is opened, there is certainly a window and at least
        // one tab, so we can safely assume that |tabs| is a non-empty array.
        // A window can only have one active tab at a time, so the array consists of
        // exactly one tab.
        callback(tabs[0]);
    });
}

/**
 * @return TabInfoRequestMessage
 */
function buildTabInfoRequestMessage() {
    return {
        [MSG_TYPE_NAME]: MSG_TYPE_TAB_INFO_REQUEST
    };
}

/**
 *
 * @param tab {Tab} the Chrome tab
 */
function handleCurrentTabAvailable(tab) {
    if (!tab.id) {
        warn("Current tab has no ID: %o", tab);
        return;
    }
    chrome.tabs.sendMessage(tab.id, buildTabInfoRequestMessage(), function (response) {
        log("Received response for [Message:" + MSG_TYPE_TAB_INFO_REQUEST + "]: %o", response);
        const tabInfo = response ? response.body : null;
        updateUiAfterTabInfoUpdate(tabInfo);
    });
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
        if (MSG_TYPE_TAB_INFO === request[MSG_TYPE_NAME]) {
            updateUiAfterTabInfoUpdate(request.body);
        }
    }
}

function handleStorageChange(changes, namespace) {
    log("[%s storage] Changes: %o", namespace, changes);
    if ("sync" === namespace) {
        updateUiAfterOptionsUpdate(mapOptionChangesToItems(changes));
    }
}


/*
 * ====================================================================================================
 * INIT
 * ====================================================================================================
 */
function init() {
    // Init SFM enabled
    setMsgToInnerHtml("sfmEnabledLabel", "options_sfm_enabled");
    setMsgToInnerHtml("sfmEnabledAlwaysLabel", "options_sfm_enabled_always");
    setMsgToInnerHtml("sfmEnabledNeverLabel", "options_sfm_enabled_never");
    setMsgToInnerHtml("sfmEnabledCustomLabel", "options_sfm_enabled_custom");
    listenForRadioChanges("sfmEnabled", handleSfmEnabledChanged);

    // Init Current channel
    const channelLabel = document.getElementById("channelLabel");
    channelLabel.innerHTML = chrome.i18n.getMessage("browserAction_channel");

    const channelSfmEnabledCheckbox = document.getElementById("channelSfmEnabledCheckbox");
    channelSfmEnabledCheckbox.onchange = handleChannelSfmEnabledChanged;

    const channelSfmEnabledLabel = document.getElementById("channelSfmEnabledLabel");
    channelSfmEnabledLabel.innerHTML = chrome.i18n.getMessage("browserAction_channelSfmEnabled");

    const openOptionsBtn = document.getElementById("openOptionsBtn");
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("menu_open_options");
    openOptionsBtn.onclick = handleOpenOptionsAction;

    getCurrentTab(handleCurrentTabAvailable);

    // Add listeners
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Initially read options
    readNecessaryOptions();
}

document.addEventListener("DOMContentLoaded", init);