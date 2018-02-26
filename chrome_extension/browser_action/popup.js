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
const SFM_STATE_ICON_ID = "sfmStateIcon";
const SFM_STATE_LABEL_ID = "sfmStateLabel";

const SFM_ENABLED_GLOBAL_ID = "sfmEnabledGlobal";

const PLATFORM_ID = "platform";
const SFM_ENABLED_ON_PLATFORM_ID = "sfmEnabledOnPlatform";

const CHANNEL_ID = "channel";
const SFM_ENABLED_ON_CHANNEL_ID = "sfmEnabledOnChannel";

const HAS_NO_EFFECT_CLASS = "hasNoEffect";

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
    chrome.storage.sync.get({[OPT_SFM_ENABLED_GLOBAL_NAME]: OPT_SFM_ENABLED_GLOBAL_DEFAULT}, function (items) {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to get [%o]: %o", OPT_SFM_ENABLED_GLOBAL_NAME, chrome.runtime.lastError);
            return;
        }
        log("[sync storage] Gotten options [%o]", items);

        updateUiAfterOptionsUpdate(items);
    });
}

/**
 *
 * @param options {!object} the options object
 */
function updateUiAfterOptionsUpdate(options) {
    if (OPT_SFM_ENABLED_GLOBAL_NAME in options) {
        const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
        updateSfmEnabledGlobalSelect(sfmEnabledGlobalSelect, options);
    }

    // If the platforms changed, may need to change the button mode and label
    if (OPT_SFM_ENABLED_PLATFORMS_NAME in options) {
        const platformElem = document.getElementById(PLATFORM_ID);
        const platform = Platform.parseFromName(platformElem.dataset[DATA_PLATFORM_NAME]);
        const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
        updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, options, platform);

    }
    // If the channels changed, may need to change the button mode and label
    if (OPT_SFM_ENABLED_CHANNELS_NAME in options) {
        const channelElem = document.getElementById(CHANNEL_ID);
        const channel = Channel.parseFromQualifiedName(channelElem.dataset[DATA_CHANNEL_QUALIFIED_NAME], channelElem.dataset[DATA_CHANNEL_DISPLAY_NAME]);
        const sfmEnabledOnChannelCheckbox = document.getElementById(SFM_ENABLED_ON_CHANNEL_ID);
        updateSfmEnabledOnChannelCheckbox(sfmEnabledOnChannelCheckbox, options, channel);
    }

    // TODO: Only declare elements once
    // TODO: When first opened, there is no title displayed if global=custom, platform!=custom
    if (OPT_SFM_ENABLED_GLOBAL_NAME in options || OPT_SFM_ENABLED_PLATFORMS_NAME in options) {
        // Visualize which setting has an effect

        const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
        const sfmEnabledGlobal = sfmEnabledGlobalSelect.value;
        const platformElem = document.getElementById(PLATFORM_ID);
        const platform = Platform.parseFromName(platformElem.dataset[DATA_PLATFORM_NAME]);
        const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
        const sfmEnabledOnPlatform = sfmEnabledOnPlatformSelect.value;

        const sfmEnabledOnPlatformContainerDiv = document.getElementById("sfmEnabledOnPlatformContainer");
        const sfmEnabledOnChannelContainerDiv = document.getElementById("sfmEnabledOnChannelContainer");

        if (sfmEnabledGlobal !== SfmEnabled.CUSTOM) {
            sfmEnabledOnPlatformContainerDiv.classList.add(HAS_NO_EFFECT_CLASS);
            sfmEnabledOnChannelContainerDiv.classList.add(HAS_NO_EFFECT_CLASS);

            if (sfmEnabledGlobal === SfmEnabled.NEVER) {
                sfmEnabledOnPlatformContainerDiv.title = chrome.i18n.getMessage("popup_sfmEnabled_onPlatform_hasNoEffect_alwaysDisabledGlobally");
                sfmEnabledOnChannelContainerDiv.title = chrome.i18n.getMessage("popup_sfmEnabled_onChannel_hasNoEffect_alwaysDisabledGlobally");
            }
            else if (sfmEnabledGlobal === SfmEnabled.ALWAYS) {
                sfmEnabledOnPlatformContainerDiv.title = chrome.i18n.getMessage("popup_sfmEnabled_onPlatform_hasNoEffect_alwaysEnabledGlobally");
                sfmEnabledOnChannelContainerDiv.title = chrome.i18n.getMessage("popup_sfmEnabled_onChannel_hasNoEffect_alwaysEnabledGlobally");
            }
        } else {
            sfmEnabledOnPlatformContainerDiv.classList.remove(HAS_NO_EFFECT_CLASS);
            sfmEnabledOnPlatformContainerDiv.title = "";

            if (sfmEnabledOnPlatform !== SfmEnabled.CUSTOM) {
                sfmEnabledOnChannelContainerDiv.classList.add(HAS_NO_EFFECT_CLASS);
                if (sfmEnabledOnPlatform === SfmEnabled.NEVER) {
                    sfmEnabledOnChannelContainerDiv.title = chrome.i18n.getMessage("popup_sfmEnabled_onChannel_hasNoEffect_alwaysDisabledOnPlatform", platform.displayName);
                } else if (sfmEnabledOnPlatform === SfmEnabled.ALWAYS) {
                    sfmEnabledOnChannelContainerDiv.title = chrome.i18n.getMessage("popup_sfmEnabled_onChannel_hasNoEffect_alwaysEnabledOnPlatform", platform.displayName);
                }
            } else {
                sfmEnabledOnChannelContainerDiv.classList.remove(HAS_NO_EFFECT_CLASS);
                sfmEnabledOnChannelContainerDiv.title = "";
            }
        }
    }
}

/**
 *
 * @param tabInfo {?TabInfo}
 */
function updateUiAfterTabInfoUpdate(tabInfo) {
    log("Updating UI after tab info received: %o", tabInfo);

    // Get relevant info from TabInfo
    const sfmState = tabInfo ? tabInfo.sfmState : SfmState.UNDETERMINED;
    const platformSerialized = tabInfo ? tabInfo.platform : null;
    const platform = Platform.deserialize(platformSerialized);
    const platformName = platform ? platform.name : "";
    const platformVerboseName = platform ? platform.verboseName : "";
    const channelSerialized = tabInfo ? tabInfo.channel : null;
    const channel = Channel.deserialize(channelSerialized);
    const channelQualifiedName = channel ? channel.qualifiedName : "";
    const channelDisplayName = channel ? channel.displayName : "";
    const channelVerboseName = channel ? channel.verboseName : "";

    // Get relevant elements
    const sfmStateIconImg = document.getElementById(SFM_STATE_ICON_ID);
    const sfmStateLabelSpan = document.getElementById(SFM_STATE_LABEL_ID);
    const sfmEnabledOnPlatformContainerDiv = document.getElementById("sfmEnabledOnPlatformContainer");
    const platformSpan = document.getElementById(PLATFORM_ID);
    const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
    const sfmEnabledOnChannelContainerDiv = document.getElementById("sfmEnabledOnChannelContainer");
    const channelSpan = document.getElementById(CHANNEL_ID);
    const sfmEnabledOnChannelCheckbox = document.getElementById(SFM_ENABLED_ON_CHANNEL_ID);

    // SfmState
    if (SfmState.ENABLED === sfmState || SfmState.DISABLED === sfmState) {
        sfmStateIconImg.src = chrome.runtime.getURL(SfmState.ENABLED === sfmState ? "img/hide_black.svg" : "img/show_black.svg");
        setVisible(sfmStateIconImg, true);
    }
    else {
        setVisible(sfmStateIconImg, false);
        sfmStateIconImg.src = "";
    }
    const sfmStateLabelMsgKey = getEnumValueMsgKey(sfmState, "popup_sfmState_");
    sfmStateLabelSpan.textContent = chrome.i18n.getMessage(sfmStateLabelMsgKey);

    // Platform
    platformSpan.dataset[DATA_PLATFORM_NAME] = platformName;
    platformSpan.textContent = platformVerboseName;
    if (platform === null) {
        setVisible(sfmEnabledOnPlatformContainerDiv, false);
    } else {
        chrome.storage.sync.get({[OPT_SFM_ENABLED_PLATFORMS_NAME]: OPT_SFM_ENABLED_PLATFORMS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get [%o]: %o", OPT_SFM_ENABLED_PLATFORMS_NAME, chrome.runtime.lastError);
                return;
            }
            log("[sync storage] Gotten %o", items);

            updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, items, platform);
            setVisible(sfmEnabledOnPlatformContainerDiv, true);
        });
    }

    // Channel
    setData(channelSpan, DATA_CHANNEL_QUALIFIED_NAME, channelQualifiedName);
    setData(channelSpan, DATA_CHANNEL_DISPLAY_NAME, channelDisplayName);
    channelSpan.textContent = channelVerboseName;
    if (channel === null) {
        setVisible(sfmEnabledOnChannelContainerDiv, false);
    } else {
        chrome.storage.sync.get({[OPT_SFM_ENABLED_CHANNELS_NAME]: OPT_SFM_ENABLED_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get [%o]: %o", OPT_SFM_ENABLED_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            log("[sync storage] Gotten %o", items);

            updateSfmEnabledOnChannelCheckbox(sfmEnabledOnChannelCheckbox, items, channel);
            setVisible(sfmEnabledOnChannelContainerDiv, true);
        });
    }
}

/**
 *
 * @param sfmEnabledGlobalSelect {!HTMLSelectElement} the select element
 * @param options {!object} the options
 */
function updateSfmEnabledGlobalSelect(sfmEnabledGlobalSelect, options) {
    sfmEnabledGlobalSelect.value = options[OPT_SFM_ENABLED_GLOBAL_NAME];
}

/**
 *
 * @param sfmEnabledOnPlatformSelect {!HTMLSelectElement} the select element
 * @param options {!object} the options
 * @param platform {!Platform} the platform
 */
function updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, options, platform) {
    sfmEnabledOnPlatformSelect.value = checkSfmStateOnPlatform(options, platform);
}

/**
 *
 * @param channelSfmEnabledCheckbox {!HTMLInputElement} the checkbox
 * @param options the options
 * @param channel {!Channel} the channel
 */
function updateSfmEnabledOnChannelCheckbox(channelSfmEnabledCheckbox, options, channel) {
    channelSfmEnabledCheckbox.checked = checkSfmEnabledOnChannel(options, channel);
}

function handleSfmEnabledGlobalChange() {
    // this: <select id="sfmEnabledGlobal">
    const sfmEnabledGlobalValue = this.value;
    chrome.storage.sync.set({[OPT_SFM_ENABLED_GLOBAL_NAME]: sfmEnabledGlobalValue}, function () {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_ENABLED_GLOBAL_NAME, sfmEnabledGlobalValue, chrome.runtime.lastError);
            return;
        }
        log("[sync storage] Set option [%s] to [%o]", OPT_SFM_ENABLED_GLOBAL_NAME, sfmEnabledGlobalValue);
    });
}

function handleSfmEnabledOnPlatformChange() {
    const platformElem = document.getElementById("platform");
    const platformName = getData(platformElem, DATA_PLATFORM_NAME);

    // this: <select id="sfmEnabledOnPlatform">
    const sfmEnabledOnPlatformValue = this.value;

    if (platformName) {
        chrome.storage.sync.get({[OPT_SFM_ENABLED_PLATFORMS_NAME]: OPT_SFM_ENABLED_PLATFORMS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get option [%s]: %o", OPT_SFM_ENABLED_PLATFORMS_NAME, chrome.runtime.lastError);
                return;
            }
            const sfmEnabledPlatforms = getOptSfmEnabledPlatforms(items);
            sfmEnabledPlatforms[platformName] = sfmEnabledOnPlatformValue;
            chrome.storage.sync.set({[OPT_SFM_ENABLED_PLATFORMS_NAME]: sfmEnabledPlatforms}, function () {
                if (chrome.runtime.lastError) {
                    error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_ENABLED_PLATFORMS_NAME, sfmEnabledPlatforms, chrome.runtime.lastError);
                    return;
                }
                log("[sync storage] Set option [%s] to [%o]", OPT_SFM_ENABLED_PLATFORMS_NAME, sfmEnabledPlatforms);
            });
        });
    }
}

function handleSfmEnabledOnChannelChange() {
    const channelElem = document.getElementById("channel");
    const channelQualifiedName = getData(channelElem, DATA_CHANNEL_QUALIFIED_NAME);
    const channelDisplayName = getData(channelElem, DATA_CHANNEL_DISPLAY_NAME);
    const channel = Channel.parseFromQualifiedName(channelQualifiedName, channelDisplayName);

    // this: <checkbox id="sfmEnabledOnChannel">
    const sfmEnabledOnChannelCheckbox = this;

    if (channel) {
        chrome.storage.sync.get({[OPT_SFM_ENABLED_CHANNELS_NAME]: OPT_SFM_ENABLED_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("[sync storage] Failed to get option [%s]: %o", OPT_SFM_ENABLED_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            const channelsSerialized = items[OPT_SFM_ENABLED_CHANNELS_NAME];
            const channels = Channel.deserializeArray(channelsSerialized);
            let newChannels;
            if (sfmEnabledOnChannelCheckbox.checked === true) {
                newChannels = sortedSetPlus(channels, channel, Channel.equal, Channel.compareByVerboseQualifiedName);
            }
            else {
                newChannels = sortedSetMinus(channels, channel, Channel.equal);
            }
            const newChannelsSerialized = Channel.serializeArray(newChannels);
            chrome.storage.sync.set({[OPT_SFM_ENABLED_CHANNELS_NAME]: newChannelsSerialized}, function () {
                if (chrome.runtime.lastError) {
                    error("[sync storage] Failed to set option [%s] to [%o]: %o", OPT_SFM_ENABLED_CHANNELS_NAME, newChannelsSerialized, chrome.runtime.lastError);
                    return;
                }
                log("[sync storage] Set option [%s] to [%o]", OPT_SFM_ENABLED_CHANNELS_NAME, newChannelsSerialized);
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
    // Header
    const appIconImgs = document.getElementsByClassName("appIcon");
    for (let i = 0; i < appIconImgs.length; i++) {
        appIconImgs[i].src = chrome.runtime.getURL("img/icon_twitch-purple_32.png");
    }

    // SFM state
    setMsgToTextContent(SFM_STATE_LABEL_ID, getEnumValueMsgKey(SfmState.UNDETERMINED, "popup_sfmState_"));

    // SFM enabled
    setMsgToTextContent("sfmEnabledLabel", "popup_sfmEnabled");

    // SFM enabled globally
    setMsgToTextContent("sfmEnabledGlobalLabel", "popup_sfmEnabled_global");
    const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
    setSelectOptions(sfmEnabledGlobalSelect, buildEnumValueToMsgKeyMap(SfmEnabled, "popup_sfmEnabled_global_"));
    sfmEnabledGlobalSelect.onchange = handleSfmEnabledGlobalChange;

    // SFM enabled on platform
    setMsgToTextContent("sfmEnabledOnPlatformLabel", "popup_sfmEnabled_onPlatform");
    const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
    setSelectOptions(sfmEnabledOnPlatformSelect, buildEnumValueToMsgKeyMap(SfmEnabled, "popup_sfmEnabled_onPlatform_"));
    sfmEnabledOnPlatformSelect.onchange = handleSfmEnabledOnPlatformChange;

    // SFM enabled on channel
    setMsgToTextContent("sfmEnabledOnChannelLabel", "popup_sfmEnabled_onChannel");
    const sfmEnabledOnChannelCheckbox = document.getElementById(SFM_ENABLED_ON_CHANNEL_ID);
    sfmEnabledOnChannelCheckbox.onchange = handleSfmEnabledOnChannelChange;
    setMsgToTextContent("sfmEnabledOnChannelCheckboxLabel", "popup_sfmEnabled_onChannel_enable");

    // Open Options btn
    const openOptionsBtn = document.getElementById(OPEN_OPTIONS_ID);
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("popup_openOptions");
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