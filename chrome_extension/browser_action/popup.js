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
const SFM_CUSTOM_ID = "sfmCustom";
const SFM_CUSTOM_LABEL_ID = "sfmCustomLabel";

const SFM_CUSTOM_PLATFORM_ID = "sfmCustomPlatform";
const SFM_CUSTOM_PLATFORM_ENABLED_ID = "sfmCustomPlatformEnabled";
const SFM_CUSTOM_PLATFORM_ENABLED_LABEL_ID = "sfmCustomPlatformEnabledLabel";

const SFM_CUSTOM_CHANNEL_ID = "sfmCustomChannel";
const SFM_CUSTOM_CHANNEL_ENABLED_ID = "sfmCustomChannelEnabled";
const SFM_CUSTOM_CHANNEL_ENABLED_LABEL_ID = "sfmCustomChannelEnabledLabel";

const OPEN_OPTIONS_ID = "openOptions";

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

    // Get relevant info from TabInfo
    const platformText = tabInfo && TAB_INFO_PLATFORM_NAME in tabInfo ? tabInfo[TAB_INFO_PLATFORM_NAME] : TAB_INFO_PLATFORM_DEFAULT;
    const platform = parsePlatformFromName(platformText);
    const channelText = tabInfo && TAB_INFO_CHANNEL_NAME in tabInfo ? tabInfo[TAB_INFO_CHANNEL_NAME] : TAB_INFO_CHANNEL_DEFAULT;
    const channel = parseChannelFromQualifiedName(channelText);

    // Get relevant elements
    const sfmCustomDiv = document.getElementById(SFM_CUSTOM_ID);
    const sfmCustomPlatformDiv = document.getElementById(SFM_CUSTOM_PLATFORM_ID);
    const sfmCustomPlatformEnabledCheckbox = document.getElementById(SFM_CUSTOM_PLATFORM_ENABLED_ID);
    const sfmCustomPlatformEnabledLabel = document.getElementById(SFM_CUSTOM_PLATFORM_ENABLED_LABEL_ID);
    const sfmCustomChannelDiv = document.getElementById(SFM_CUSTOM_CHANNEL_ID);
    const sfmCustomChannelEnabledCheckbox = document.getElementById(SFM_CUSTOM_CHANNEL_ENABLED_ID);
    const sfmCustomChannelEnabledLabel = document.getElementById(SFM_CUSTOM_CHANNEL_ENABLED_LABEL_ID);

    // Configure UI
    // Custom options
    if (platform === null && channel === null) {
        sfmCustomDiv.classList.add(OPND_HIDDEN_CLASS);
    }
    else {
        sfmCustomDiv.classList.remove(OPND_HIDDEN_CLASS);
    }

    // Platform
    sfmCustomPlatformDiv.dataset.channel = platformText;
    sfmCustomPlatformEnabledCheckbox.checked = false;
    if (platform === null) {
        sfmCustomPlatformDiv.classList.add(OPND_HIDDEN_CLASS);
        sfmCustomPlatformEnabledLabel.textContent = "";
    } else {
        sfmCustomPlatformDiv.classList.remove(OPND_HIDDEN_CLASS);
        sfmCustomPlatformEnabledLabel.textContent = chrome.i18n.getMessage("browserAction_sfmCustom_platformEnabled", platform.displayName)
    }

    // Channel
    sfmCustomChannelDiv.dataset.channel = channelText;
    sfmCustomChannelEnabledCheckbox.checked = false;

    if (channel === null) {
        sfmCustomChannelDiv.classList.add(OPND_HIDDEN_CLASS);
        sfmCustomChannelEnabledLabel.textContent = "";
    } else {
        sfmCustomChannelEnabledLabel.textContent = chrome.i18n.getMessage("browserAction_sfmCustom_channelEnabled", channel.displayName);
        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get [%o]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            log("[sync storage] Gotten %o", items);

            updateChannelSfmEnabledCheckbox(sfmCustomChannelEnabledCheckbox, channel.qualifiedName, items[OPT_SFM_CHANNELS_NAME]);
            sfmCustomChannelDiv.classList.remove(OPND_HIDDEN_CLASS);
        });
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
    const channelElem = document.getElementById("sfmCustomChannel");
    const channelQualifiedName = channelElem.dataset.channel;

    // this: <checkbox id="sfmCustomChannelEnabled">
    const sfmCustomChannelEnabledCheckbox = this;

    if (channelQualifiedName && channelQualifiedName.length > 0) {
        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get option [%s]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            const channels = items[OPT_SFM_CHANNELS_NAME];
            let newChannels;
            if (sfmCustomChannelEnabledCheckbox.checked === true) {
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

    // Custom SFM options
    const sfmCustomLabel = document.getElementById(SFM_CUSTOM_LABEL_ID);
    sfmCustomLabel.innerHTML = chrome.i18n.getMessage("options_sfm_custom");

    // Platform
    const sfmCustomPlatformEnabledCheckbox = document.getElementById(SFM_CUSTOM_PLATFORM_ENABLED_ID);
    sfmCustomPlatformEnabledCheckbox.onchange = null;

    // Channel
    const sfmCustomChannelEnabledCheckbox = document.getElementById(SFM_CUSTOM_CHANNEL_ENABLED_ID);
    sfmCustomChannelEnabledCheckbox.onchange = handleChannelSfmEnabledChanged;

    // Open Options btn
    const openOptionsBtn = document.getElementById(OPEN_OPTIONS_ID);
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("menu_openOptions");
    openOptionsBtn.onclick = handleOpenOptionsAction;

    // Get tab
    getCurrentTab(handleCurrentTabAvailable);

    // Add listeners
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Initially read options
    readNecessaryOptions();
}

document.addEventListener("DOMContentLoaded", init);