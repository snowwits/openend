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
 * GLOBAL VARIABLES
 * ====================================================================================================
 */
let GLOBAL_options = getDefaultOptionsCopy();

/*
 * ====================================================================================================
 * FUNCTIONS
 * ====================================================================================================
 */

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
        const platform = Platform.parseFromName(getData(platformElem, DATA_PLATFORM_NAME));
        const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
        updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, options, platform);

    }
    // If the channels changed, may need to change the button mode and label
    if (OPT_SFM_ENABLED_CHANNELS_NAME in options) {
        const channelElem = document.getElementById(CHANNEL_ID);
        const channel = Channel.parseFromQualifiedName(getData(channelElem, DATA_CHANNEL_QUALIFIED_NAME), getData(channelElem, DATA_CHANNEL_DISPLAY_NAME));
        const sfmEnabledOnChannelCheckbox = document.getElementById(SFM_ENABLED_ON_CHANNEL_ID);
        updateSfmEnabledOnChannelCheckbox(sfmEnabledOnChannelCheckbox, options, channel);
    }

    updateHasNoEffect(options);
}

/**
 * Visualize which setting has an effect.
 */
function updateHasNoEffect(options) {
    if (OPT_SFM_ENABLED_GLOBAL_NAME in options || OPT_SFM_ENABLED_PLATFORMS_NAME in options) {
        const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
        const sfmEnabledGlobal = sfmEnabledGlobalSelect.value;
        const platformElem = document.getElementById(PLATFORM_ID);
        const platform = Platform.parseFromName(getData(platformElem, DATA_PLATFORM_NAME));
        const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
        const sfmEnabledOnPlatform = sfmEnabledOnPlatformSelect.value;

        const sfmEnabledOnPlatformContainerDiv = document.getElementById("sfmEnabledOnPlatformContainer");
        const sfmEnabledOnChannelContainerDiv = document.getElementById("sfmEnabledOnChannelContainer");

        console.log("setting hasNoEffect [sfmEnabledGlobal=" + sfmEnabledGlobal + ", platform=" + platform + ", sfmEnabledOnPlatform=" + sfmEnabledOnPlatform);

        if (sfmEnabledGlobal !== SfmEnabled.CUSTOM) {
            sfmEnabledOnPlatformContainerDiv.classList.add(HAS_NO_EFFECT_CLASS);
            sfmEnabledOnChannelContainerDiv.classList.add(HAS_NO_EFFECT_CLASS);

            let title = "";
            if (sfmEnabledGlobal === SfmEnabled.NEVER) {
                title = chrome.i18n.getMessage("popup_sfmEnabled_hasNoEffect_disabledGlobally");
            }
            else if (sfmEnabledGlobal === SfmEnabled.ALWAYS) {
                title = chrome.i18n.getMessage("popup_sfmEnabled_hasNoEffect_enabledGlobally");
            }
            sfmEnabledOnPlatformContainerDiv.title = title;
            sfmEnabledOnChannelContainerDiv.title = title
        } else {
            sfmEnabledOnPlatformContainerDiv.classList.remove(HAS_NO_EFFECT_CLASS);
            sfmEnabledOnPlatformContainerDiv.title = "";

            if (sfmEnabledOnPlatform !== SfmEnabled.CUSTOM) {
                sfmEnabledOnChannelContainerDiv.classList.add(HAS_NO_EFFECT_CLASS);

                let title = "";
                if (sfmEnabledOnPlatform === SfmEnabled.NEVER) {
                    title = chrome.i18n.getMessage("popup_sfmEnabled_hasNoEffect_disabledOnPlatform");
                } else if (sfmEnabledOnPlatform === SfmEnabled.ALWAYS) {
                    title = chrome.i18n.getMessage("popup_sfmEnabled_hasNoEffect_enabledOnPlatform");
                }
                sfmEnabledOnChannelContainerDiv.title = title;
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

    // Get relevant DOM elements
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
    setData(platformSpan, DATA_PLATFORM_NAME, platformName);
    platformSpan.textContent = platformVerboseName;
    if (platform === null) {
        setVisible(sfmEnabledOnPlatformContainerDiv, false);
    } else {
        updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, GLOBAL_options, platform);
        setVisible(sfmEnabledOnPlatformContainerDiv, true);

        // With potentially new platform information, hasNoEffect needs an update
        updateHasNoEffect(GLOBAL_options);
    }

    // Channel
    setData(channelSpan, DATA_CHANNEL_QUALIFIED_NAME, channelQualifiedName);
    setData(channelSpan, DATA_CHANNEL_DISPLAY_NAME, channelDisplayName);
    channelSpan.textContent = channelVerboseName;
    if (channel === null) {
        setVisible(sfmEnabledOnChannelContainerDiv, false);
    } else {
        updateSfmEnabledOnChannelCheckbox(sfmEnabledOnChannelCheckbox, GLOBAL_options, channel);
        setVisible(sfmEnabledOnChannelContainerDiv, true);
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
 * @param platform {?Platform} the platform (if on platform page and already loaded)
 */
function updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, options, platform) {
    if (platform) {
        sfmEnabledOnPlatformSelect.value = checkSfmStateOnPlatform(options, platform);
    }
}

/**
 *
 * @param channelSfmEnabledCheckbox {!HTMLInputElement} the checkbox
 * @param options the options
 * @param channel {?Channel} the channel (if on channel page and already loaded)
 */
function updateSfmEnabledOnChannelCheckbox(channelSfmEnabledCheckbox, options, channel) {
    if (channel) {
        channelSfmEnabledCheckbox.checked = checkSfmEnabledOnChannel(options, channel);
    }
}

function handleSfmEnabledGlobalChange() {
    // this: <select id="sfmEnabledGlobal">
    const sfmEnabledGlobalValue = this.value;

    opnd.platform.writeOptions({[OPT_SFM_ENABLED_GLOBAL_NAME]: sfmEnabledGlobalValue});
}

function handleSfmEnabledOnPlatformChange() {
    const platformElem = document.getElementById("platform");
    const platformName = getData(platformElem, DATA_PLATFORM_NAME);

    // this: <select id="sfmEnabledOnPlatform">
    const sfmEnabledOnPlatformValue = this.value;

    if (platformName) {
        const sfmEnabledPlatforms = getOptSfmEnabledPlatforms(GLOBAL_options);
        sfmEnabledPlatforms[platformName] = sfmEnabledOnPlatformValue;
        opnd.platform.writeOptions({[OPT_SFM_ENABLED_PLATFORMS_NAME]: sfmEnabledPlatforms});
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
        const sfmEnabledChannels = getOptSfmEnabledChannels(GLOBAL_options);
        const channels = Channel.deserializeArray(sfmEnabledChannels);
        let newChannels;
        if (sfmEnabledOnChannelCheckbox.checked === true) {
            newChannels = sortedSetPlus(channels, channel, Channel.equal, Channel.compareByVerboseQualifiedName);
        }
        else {
            newChannels = sortedSetMinus(channels, channel, Channel.equal);
        }
        const newChannelsSerialized = Channel.serializeArray(newChannels);
        opnd.platform.writeOptions({[OPT_SFM_ENABLED_CHANNELS_NAME]: newChannelsSerialized});
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
    opnd.platform.openOptionsPage();
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
        const tabInfo = request.body;
        updateUiAfterTabInfoUpdate(tabInfo);
    }
}

function handleStorageChange(changes, namespace) {
    log("[%s storage] Changes: %o", namespace, changes);
    if ("sync" === namespace) {
        for (const key in changes) {
            GLOBAL_options[key] = changes[key].newValue;
        }
        updateUiAfterOptionsUpdate(mapOptionChangesToItems(changes));
    }
}

/**
 * @param tab {!Tab}
 * @return {!Promise<{TabInfo}>}
 */
function requestTabInfo(tab) {
    if (!tab.id) {
        return Promise.reject(Error("Current tab has no ID: " + tab));
    }
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, new TabInfoRequestMessage(), (response) => {
            if (chrome.runtime.lastError) {
                warn("[requestTabInfo] Failed to get TabInfo (maybe not on platform page?): %o", chrome.runtime.lastError);
                reject(Error(chrome.runtime.lastError.message));
            } else {
                log("[requestTabInfo] Received response to [%s]: [%o]", MessageType.TAB_INFO_REQUEST, response);
                const tabInfo = response.body;
                resolve(tabInfo);
            }
        });
    });
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
        appIconImgs[i].src = chrome.runtime.getURL("img/icon_twitch-purple.svg");
    }

    // SFM state
    setMsgToTextContent(SFM_STATE_LABEL_ID, getEnumValueMsgKey(SfmState.UNDETERMINED, "popup_sfmState_"));

    // SFM enabled
    setMsgToTextContent("sfmEnabledLabel", "popup_sfmEnabled");

    // SFM enabled globally
    setMsgToTextContent("sfmEnabledGlobalLabel", "popup_sfmEnabled_global");
    const sfmEnabledGlobalIconImg = document.getElementById("sfmEnabledGlobalIcon");
    sfmEnabledGlobalIconImg.src = chrome.runtime.getURL("img/global_black.svg");
    const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
    setSelectOptions(sfmEnabledGlobalSelect, buildEnumValueToMsgKeyMap(SfmEnabled, "popup_sfmEnabled_global_"));
    sfmEnabledGlobalSelect.onchange = handleSfmEnabledGlobalChange;

    // SFM enabled on platform
    setMsgToTextContent("sfmEnabledOnPlatformLabel", "popup_sfmEnabled_onPlatform");
    const sfmEnabledOnPlatformIconImg = document.getElementById("sfmEnabledOnPlatformIcon");
    sfmEnabledOnPlatformIconImg.src = chrome.runtime.getURL("img/platform_black.svg");
    const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
    setSelectOptions(sfmEnabledOnPlatformSelect, buildEnumValueToMsgKeyMap(SfmEnabled, "popup_sfmEnabled_onPlatform_"));
    sfmEnabledOnPlatformSelect.onchange = handleSfmEnabledOnPlatformChange;

    // SFM enabled on channel
    setMsgToTextContent("sfmEnabledOnChannelLabel", "popup_sfmEnabled_onChannel");
    const sfmEnabledOnChannelIconImg = document.getElementById("sfmEnabledOnChannelIcon");
    sfmEnabledOnChannelIconImg.src = chrome.runtime.getURL("img/channel_black.svg");
    const sfmEnabledOnChannelCheckbox = document.getElementById(SFM_ENABLED_ON_CHANNEL_ID);
    sfmEnabledOnChannelCheckbox.onchange = handleSfmEnabledOnChannelChange;
    setMsgToTextContent("sfmEnabledOnChannelCheckboxLabel", "popup_sfmEnabled_onChannel_enable");

    // Open Options btn
    const openOptionsBtn = document.getElementById(OPEN_OPTIONS_ID);
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("popup_openOptions");
    openOptionsBtn.onclick = handleOpenOptionsAction;

    // Read options
    const necessaryOptions = {
        [OPT_SFM_ENABLED_GLOBAL_NAME]: OPT_SFM_ENABLED_GLOBAL_DEFAULT,
        [OPT_SFM_ENABLED_PLATFORMS_NAME]: OPT_SFM_ENABLED_PLATFORMS_DEFAULT,
        [OPT_SFM_ENABLED_CHANNELS_NAME]: OPT_SFM_ENABLED_CHANNELS_NAME
    };
    opnd.platform.readOptions(necessaryOptions).then((options) => {
        GLOBAL_options = options;

        // Add listeners
        chrome.runtime.onMessage.addListener(handleMessage);
        chrome.storage.onChanged.addListener(handleStorageChange);

        // Update UI according to read options
        updateUiAfterOptionsUpdate(options);

        // Get TabInfo and update UI accordingly
        opnd.platform.getCurrentTab().then(requestTabInfo).then(updateUiAfterTabInfoUpdate).catch(error => {
            // ignore because probably normal behavior (it is logged anyway)
        });
    });

}

document.addEventListener("DOMContentLoaded", init);