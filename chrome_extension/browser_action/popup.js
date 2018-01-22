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
const SFM_CUSTOM_PLATFORM_HEADER = "sfmCustomPlatformHeader";
const SFM_CUSTOM_PLATFORM_ENABLED_ID = "sfmCustomPlatformEnabled";
const SFM_CUSTOM_PLATFORM_ENABLED_LABEL_ID = "sfmCustomPlatformEnabledLabel";

const SFM_CUSTOM_CHANNEL_ID = "sfmCustomChannel";
const SFM_CUSTOM_CHANNEL_HEADER = "sfmCustomChannelHeader";
const SFM_CUSTOM_CHANNEL_ENABLED_ID = "sfmCustomChannelEnabled";
const SFM_CUSTOM_CHANNEL_ENABLED_LABEL_ID = "sfmCustomChannelEnabledLabel";

const OPEN_OPTIONS_ID = "openOptions";

const DATA_PLATFORM_NAME = "platformName";
const DATA_CHANNEL_QUALIFIED_NAME = "channelQualifiedName";
const DATA_CHANNEL_DISPLAY_NAME = "channelDisplayName";

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

    const platformSerialized = tabInfo ? tabInfo.platform : null;
    const platform = Platform.deserialize(platformSerialized);
    const platformName = platform ? platform.name : "";
    const channelSerialized = tabInfo ? tabInfo.channel : null;
    const channel = Channel.deserialize(channelSerialized);
    const channelQualifiedName = channel ? channel.qualifiedName : "";
    const channelDisplayName = channel ? channel.displayName : "";
    console.log("platformSerialized: %o", platformSerialized);
    console.log("platform: %o", platform);
    console.log("channelSerialized: %o", channelSerialized);
    console.log("channel: %o", channel);

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
        setVisible(sfmCustomDiv, false);
    }
    else {
        setVisible(sfmCustomDiv, true);
    }

    // Platform
    sfmCustomPlatformDiv.dataset[DATA_PLATFORM_NAME] = platformName;
    sfmCustomPlatformEnabledCheckbox.checked = false;
    if (platform === null) {
        setVisible(sfmCustomPlatformDiv, false);
        sfmCustomPlatformEnabledLabel.textContent = "";
    } else {
        sfmCustomPlatformEnabledLabel.textContent = platform.verboseName;
        chrome.storage.sync.get({[OPT_SFM_PLATFORMS_NAME]: OPT_SFM_PLATFORMS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get [%o]: %o", OPT_SFM_PLATFORMS_NAME, chrome.runtime.lastError);
                return;
            }
            log("[sync storage] Gotten %o", items);

            updatePlatformSfmEnabledCheckbox(sfmCustomPlatformEnabledCheckbox, items, platform);
            setVisible(sfmCustomPlatformDiv, true);
        });
    }

    // Channel
    sfmCustomChannelDiv.dataset[DATA_CHANNEL_QUALIFIED_NAME] = channelQualifiedName;
    sfmCustomChannelDiv.dataset[DATA_CHANNEL_DISPLAY_NAME] = channelDisplayName;
    sfmCustomChannelEnabledCheckbox.checked = false;

    if (channel === null) {
        setVisible(sfmCustomChannelDiv, false);
        sfmCustomChannelEnabledLabel.textContent = "";
    } else {
        sfmCustomChannelEnabledLabel.textContent = channel.verboseName;
        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get [%o]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            log("[sync storage] Gotten %o", items);

            updateChannelSfmEnabledCheckbox(sfmCustomChannelEnabledCheckbox, items, channel);
            setVisible(sfmCustomChannelDiv, true);
        });
    }
}

/**
 *
 * @param options {!object} the options object
 */
function updateUiAfterOptionsUpdate(options) {
    // If the platforms changed, may need to change the button mode and label
    if (OPT_SFM_PLATFORMS_NAME in options) {
        const platformElem = document.getElementById(SFM_CUSTOM_PLATFORM_ID);
        const platformSfmEnabledCheckbox = document.getElementById(SFM_CUSTOM_PLATFORM_ENABLED_ID);
        const platform = Platform.parseFromName(platformElem.dataset[DATA_PLATFORM_NAME]);
        updatePlatformSfmEnabledCheckbox(platformSfmEnabledCheckbox, options, platform);
    }
    // If the channels changed, may need to change the button mode and label
    if (OPT_SFM_CHANNELS_NAME in options) {
        const channelElem = document.getElementById(SFM_CUSTOM_CHANNEL_ID);
        const channelSfmEnabledCheckbox = document.getElementById(SFM_CUSTOM_CHANNEL_ENABLED_ID);
        const channel = Channel.parseFromQualifiedName(channelElem.dataset[DATA_CHANNEL_QUALIFIED_NAME], channelElem.dataset[DATA_CHANNEL_DISPLAY_NAME]);
        updateChannelSfmEnabledCheckbox(channelSfmEnabledCheckbox, options, channel);
    }
    if (OPT_SFM_ENABLED_NAME in options) {
        setRadioValues("sfmEnabled", options[OPT_SFM_ENABLED_NAME]);
    }
}

/**
 *
 * @param platformSfmEnabledCheckbox {!HTMLInputElement} the checkbox
 * @param options {!object} the options
 * @param platform {!Platform} the platform
 */
function updatePlatformSfmEnabledCheckbox(platformSfmEnabledCheckbox, options, platform) {
    platformSfmEnabledCheckbox.checked = sfmPlatformsContain(options, platform);
}

/**
 *
 * @param channelSfmEnabledCheckbox {!HTMLInputElement} the checkbox
 * @param options the options
 * @param channel {!Channel} the channel
 */
function updateChannelSfmEnabledCheckbox(channelSfmEnabledCheckbox, options, channel) {
    channelSfmEnabledCheckbox.checked = sfmChannelsContain(options, channel);
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

function handlePlatformSfmEnabledChanged() {
    const platformElem = document.getElementById("sfmCustomPlatform");
    const platformName = getData(platformElem, DATA_PLATFORM_NAME);
    const platform = Platform.parseFromName(platformName);

    // this: <checkbox id="sfmCustomPlatformEnabled">
    const sfmCustomPlatformEnabledCheckbox = this;

    if (platform) {
        chrome.storage.sync.get({[OPT_SFM_PLATFORMS_NAME]: OPT_SFM_PLATFORMS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get option [%s]: %o", OPT_SFM_PLATFORMS_NAME, chrome.runtime.lastError);
                return;
            }
            const platformsSerialized = items[OPT_SFM_PLATFORMS_NAME];
            const platforms = Platform.deserializeArray(platformsSerialized);
            let newPlatforms;
            if (sfmCustomPlatformEnabledCheckbox.checked === true) {
                newPlatforms = sortedSetPlus(platforms, platform, Platform.equal, Platform.compareByVerboseName);
            }
            else {
                newPlatforms = sortedSetMinus(platforms, platform, Platform.equal);
            }
            const newPlatformsSerialized = Platform.serializeArray(newPlatforms);
            chrome.storage.sync.set({[OPT_SFM_PLATFORMS_NAME]: newPlatformsSerialized}, function () {
                if (chrome.runtime.lastError) {
                    error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_PLATFORMS_NAME, newPlatformsSerialized, chrome.runtime.lastError);
                    return;
                }
                log("[sync storage] Set option [%s] to [%o]", OPT_SFM_PLATFORMS_NAME, newPlatformsSerialized);
            });
        });
    }
}

function handleChannelSfmEnabledChanged() {
    const channelElem = document.getElementById("sfmCustomChannel");
    const channelQualifiedName = getData(channelElem, DATA_CHANNEL_QUALIFIED_NAME);
    const channelDisplayName = getData(channelElem, DATA_CHANNEL_DISPLAY_NAME);
    const channel = Channel.parseFromQualifiedName(channelQualifiedName, channelDisplayName);

    // this: <checkbox id="sfmCustomChannelEnabled">
    const sfmCustomChannelEnabledCheckbox = this;

    if (channel) {
        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get option [%s]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            const channelsSerialized = items[OPT_SFM_CHANNELS_NAME];
            const channels = Channel.deserializeArray(channelsSerialized);
            let newChannels;
            if (sfmCustomChannelEnabledCheckbox.checked === true) {
                newChannels = sortedSetPlus(channels, channel, Channel.equal, Channel.compareByVerboseQualifiedName);
            }
            else {
                newChannels = sortedSetMinus(channels, channel, Channel.equal);
            }
            const newChannelsSerialized = Channel.serializeArray(newChannels);
            chrome.storage.sync.set({[OPT_SFM_CHANNELS_NAME]: newChannelsSerialized}, function () {
                if (chrome.runtime.lastError) {
                    error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_CHANNELS_NAME, newChannelsSerialized, chrome.runtime.lastError);
                    return;
                }
                log("[sync storage] Set option [%s] to [%o]", OPT_SFM_CHANNELS_NAME, newChannelsSerialized);
            });
        });
    }
}

function sortedSetPlus(array, plusItem, equalsFunction, compareFunction) {
    if (array.some(i => equalsFunction(i, plusItem))) {
        return array;
    }
    array.push(plusItem);
    array.sort(compareFunction);
    return array;
}

function sortedSetMinus(array, minusItem, equalsFunction) {
    // Find item
    const indexOfItem = array.findIndex(e => equalsFunction(e, minusItem));
    if (indexOfItem >= 0) {
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
 *
 * @param tab {Tab} the Chrome tab
 */
function handleCurrentTabAvailable(tab) {
    if (!tab.id) {
        warn("Current tab has no ID: %o", tab);
        return;
    }
    chrome.tabs.sendMessage(tab.id, new TabInfoRequestMessage(), function (response) {
        log("Received response for [Message:" + MessageType.TAB_INFO_REQUEST + "]: %o", response);
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
    if (MessageType.TAB_INFO === request.type) {
        updateUiAfterTabInfoUpdate(request.body);
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
    setMsgToTextContent("sfmEnabledLabel", "options_sfm_enabled");
    setMsgToTextContent("sfmEnabledAlwaysLabel", "options_sfm_enabled_always");
    setMsgToTextContent("sfmEnabledNeverLabel", "options_sfm_enabled_never");
    setMsgToTextContent("sfmEnabledCustomLabel", "options_sfm_enabled_custom");
    listenForRadioChanges("sfmEnabled", handleSfmEnabledChanged);

    // Custom SFM options
    const sfmCustomLabel = document.getElementById(SFM_CUSTOM_LABEL_ID);
    sfmCustomLabel.innerHTML = chrome.i18n.getMessage("options_sfm_custom");

    // Platform
    const sfmCustomPlatformHeader = document.getElementById(SFM_CUSTOM_PLATFORM_HEADER);
    sfmCustomPlatformHeader.textContent = chrome.i18n.getMessage("browserAction_sfmCustom_platformHeader");
    const sfmCustomPlatformEnabledCheckbox = document.getElementById(SFM_CUSTOM_PLATFORM_ENABLED_ID);
    sfmCustomPlatformEnabledCheckbox.onchange = handlePlatformSfmEnabledChanged;

    // Channel
    const sfmCustomChannelHeader = document.getElementById(SFM_CUSTOM_CHANNEL_HEADER);
    sfmCustomChannelHeader.textContent = chrome.i18n.getMessage("browserAction_sfmCustom_channelHeader");
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