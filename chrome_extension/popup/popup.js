/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function log(msg, ...substitutions) {
    logWithComponent("popup", msg, ...substitutions);
}

function warn(msg, ...substitutions) {
    warnWithComponent("popup", msg, ...substitutions);
}

function error(msg, ...substitutions) {
    errorWithComponent("popup", msg, ...substitutions);
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
const PLATFORM_ICON_ID = "platformIcon";
const PLATFORM_NAME_ID = "platformName";
const SFM_ENABLED_ON_PLATFORM_ID = "sfmEnabledOnPlatform";

const CHANNEL_ID = "channel";
const CHANNEL_QUALIFIED_NAME_ID = "channelQualifiedName";
const SFM_ENABLED_ON_CHANNEL_ID = "sfmEnabledOnChannel";

const INEFFECTIVE_CLASS = "ineffective";

const OPEN_OPTIONS_ID = "openOptions";


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

    updateIneffective(options);
}

/**
 * Visualize which setting has an effect.
 */
function updateIneffective(options) {
    if (OPT_SFM_ENABLED_GLOBAL_NAME in options || OPT_SFM_ENABLED_PLATFORMS_NAME in options) {
        const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
        const sfmEnabledGlobal = sfmEnabledGlobalSelect.value;
        const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
        const sfmEnabledOnPlatform = sfmEnabledOnPlatformSelect.value;

        const sfmEnabledOnPlatformContainerDiv = document.getElementById("sfmEnabledOnPlatformContainer");
        const sfmEnabledOnChannelContainerDiv = document.getElementById("sfmEnabledOnChannelContainer");

        if (sfmEnabledGlobal !== SfmEnabled.CUSTOM) {
            sfmEnabledOnPlatformContainerDiv.classList.add(INEFFECTIVE_CLASS);
            sfmEnabledOnChannelContainerDiv.classList.add(INEFFECTIVE_CLASS);

            let title = "";
            if (sfmEnabledGlobal === SfmEnabled.NEVER) {
                title = chrome.i18n.getMessage("popup_sfmEnabled_ineffective_disabledGlobally");
            }
            else if (sfmEnabledGlobal === SfmEnabled.ALWAYS) {
                title = chrome.i18n.getMessage("popup_sfmEnabled_ineffective_enabledGlobally");
            }
            sfmEnabledOnPlatformContainerDiv.title = title;
            sfmEnabledOnChannelContainerDiv.title = title;
        } else {
            sfmEnabledOnPlatformContainerDiv.classList.remove(INEFFECTIVE_CLASS);
            sfmEnabledOnPlatformContainerDiv.title = "";

            if (sfmEnabledOnPlatform !== SfmEnabled.CUSTOM) {
                sfmEnabledOnChannelContainerDiv.classList.add(INEFFECTIVE_CLASS);

                let title = "";
                if (sfmEnabledOnPlatform === SfmEnabled.NEVER) {
                    title = chrome.i18n.getMessage("popup_sfmEnabled_ineffective_disabledOnPlatform");
                } else if (sfmEnabledOnPlatform === SfmEnabled.ALWAYS) {
                    title = chrome.i18n.getMessage("popup_sfmEnabled_ineffective_enabledOnPlatform");
                }
                sfmEnabledOnChannelContainerDiv.title = title;
            } else {
                sfmEnabledOnChannelContainerDiv.classList.remove(INEFFECTIVE_CLASS);
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
    const sfmState = tabInfo ? tabInfo.sfmState : SfmState.UNSUPPORTED;
    const platformSerialized = tabInfo ? tabInfo.platform : null;
    const platform = Platform.deserialize(platformSerialized);
    const platformName = platform ? platform.name : "";
    const platformDisplayName = platform ? platform.displayName : "";
    const channelSerialized = tabInfo ? tabInfo.channel : null;
    const channel = Channel.deserialize(channelSerialized);
    const channelQualifiedName = channel ? channel.qualifiedName : "";
    const channelDisplayName = channel ? channel.displayNameOrName : "";

    // Get relevant DOM elements
    const sfmStateIconImg = document.getElementById(SFM_STATE_ICON_ID);
    const sfmStateLabelSpan = document.getElementById(SFM_STATE_LABEL_ID);
    const sfmEnabledOnPlatformContainerDiv = document.getElementById("sfmEnabledOnPlatformContainer");
    const platformSpan = document.getElementById(PLATFORM_ID);
    const platformIconImg = document.getElementById(PLATFORM_ICON_ID);
    const platformNameSpan = document.getElementById(PLATFORM_NAME_ID);
    const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
    const sfmEnabledOnChannelContainerDiv = document.getElementById("sfmEnabledOnChannelContainer");
    const channelSpan = document.getElementById(CHANNEL_ID);
    const channelQualifiedNameSpan = document.getElementById(CHANNEL_QUALIFIED_NAME_ID);
    const sfmEnabledOnChannelCheckbox = document.getElementById(SFM_ENABLED_ON_CHANNEL_ID);

    // SfmState: icon
    if (SfmState.ACTIVE === sfmState || SfmState.INACTIVE === sfmState || SfmState.CHANNEL_DEPENDENT === sfmState) {
        sfmStateIconImg.src = chrome.runtime.getURL(SfmState.INACTIVE === sfmState ? "img/show_black.svg" : "img/hide_black.svg");
        setVisible(sfmStateIconImg, true);
    }
    else {
        setVisible(sfmStateIconImg, false);
        sfmStateIconImg.src = "";
    }
    // SfmState: label, tooltip
    const sfmStateLabelMsgKey = getEnumValueMsgKey(sfmState, "popup_sfmState_");
    sfmStateLabelSpan.textContent = chrome.i18n.getMessage(sfmStateLabelMsgKey);
    sfmStateLabelSpan.title = chrome.i18n.getMessage("popup_sfmState_" + sfmState + "_tooltip");

    // Platform
    setData(platformSpan, DATA_PLATFORM_NAME, platformName);
    platformSpan.textContent = platformDisplayName;
    platformNameSpan.textContent = platformName;
    if (platform === null) {
        // Change back to default icon
        platformIconImg.src = chrome.runtime.getURL("img/platform_black.svg");

        // SfmEnabled values
        clearSelectOptions(sfmEnabledOnPlatformSelect);

        // Hide the container
        setVisible(sfmEnabledOnPlatformContainerDiv, false);
    } else {
        platformIconImg.src = chrome.runtime.getURL("img/platform_" + platformName + "_black.svg");

        // SfmEnabled values
        const enumValueToMsgKeyMap = buildEnumValueToMsgKeyMap(SfmEnabled, "popup_sfmEnabled_onPlatform_");
        setSelectOptions(sfmEnabledOnPlatformSelect, enumValueToMsgKeyMap, platform.supportedSfmEnabledValues);
        // Select the correct SfmEnabled value
        updateSfmEnabledOnPlatformSelect(sfmEnabledOnPlatformSelect, GLOBAL_options, platform);

        // Show the container
        setVisible(sfmEnabledOnPlatformContainerDiv, true);
    }

    // With potentially new platform information, ineffective needs an update
    updateIneffective(GLOBAL_options);

    // Channel
    setData(channelSpan, DATA_CHANNEL_QUALIFIED_NAME, channelQualifiedName);
    setData(channelSpan, DATA_CHANNEL_DISPLAY_NAME, channelDisplayName);
    channelSpan.textContent = channelDisplayName;
    channelQualifiedNameSpan.textContent = channelQualifiedName;
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
        sfmEnabledOnPlatformSelect.value = getSfmEnabledOnPlatform(options, platform);
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
        channelSfmEnabledCheckbox.checked = getSfmEnabledOnChannel(options, channel);
    }
}

function handleSfmEnabledGlobalChange() {
    // this: <select id="sfmEnabledGlobal">
    const sfmEnabledGlobalValue = this.value;

    opnd.browser.writeOptions({[OPT_SFM_ENABLED_GLOBAL_NAME]: sfmEnabledGlobalValue});
}

function handleSfmEnabledOnPlatformChange() {
    const platformElem = document.getElementById(PLATFORM_ID);
    const platformName = getData(platformElem, DATA_PLATFORM_NAME);

    // this: <select id="sfmEnabledOnPlatform">
    const sfmEnabledOnPlatformValue = this.value;

    if (platformName) {
        const sfmEnabledPlatforms = getOptSfmEnabledPlatforms(GLOBAL_options);
        sfmEnabledPlatforms[platformName] = sfmEnabledOnPlatformValue;
        opnd.browser.writeOptions({[OPT_SFM_ENABLED_PLATFORMS_NAME]: sfmEnabledPlatforms});
    }
}

function handleSfmEnabledOnChannelChange() {
    const channelElem = document.getElementById(CHANNEL_ID);
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
        opnd.browser.writeOptions({[OPT_SFM_ENABLED_CHANNELS_NAME]: newChannelsSerialized});
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
    opnd.browser.openOptionsPage();
}

/**
 *
 * @param message {!Message} the message
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(message, sender, sendResponse) {
    log("Received message [%o] from [%o]", message, sender);

    if (sender.tab.active !== true) {
        log("Ignoring message [%o] from [%o] because it did not came from the current tab", message, sender);
        return;
    }
    if (message.type === MessageType.TAB_INFO) {
        const tabInfo = message.body;
        updateUiAfterTabInfoUpdate(tabInfo);
        return;
    }
    log("Ignoring message [%o] from [%o] because it has an irrelevant message type [%s]", message, sender, message.type);
}

function handleStorageChange(changes, areaName) {
    log("[%s storage] Changes: %o", areaName, changes);
    if ("sync" === areaName) {
        for (const key in changes) {
            GLOBAL_options[key] = changes[key].newValue;
        }
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
        appIconImgs[i].src = chrome.runtime.getURL("img/icon_twitch-purple.svg");
    }

    // SFM state
    setMsgToTextContent(SFM_STATE_LABEL_ID, "popup_sfmState_" + SfmState.UNSUPPORTED);
    setMsgToTitle(SFM_STATE_LABEL_ID, "popup_sfmState_" + SfmState.UNSUPPORTED + "_tooltip");

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
    const platformIconImg = document.getElementById(PLATFORM_ICON_ID);
    platformIconImg.src = chrome.runtime.getURL("img/platform_black.svg");
    const sfmEnabledOnPlatformSelect = document.getElementById(SFM_ENABLED_ON_PLATFORM_ID);
    sfmEnabledOnPlatformSelect.onchange = handleSfmEnabledOnPlatformChange;

    // SFM enabled on channel
    const channelIconImg = document.getElementById("channelIcon");
    channelIconImg.src = chrome.runtime.getURL("img/channel_black.svg");
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
        [OPT_SFM_ENABLED_CHANNELS_NAME]: OPT_SFM_ENABLED_CHANNELS_DEFAULT
    };
    opnd.browser.readOptions(necessaryOptions).then((options) => {
        GLOBAL_options = options;

        // Add listeners
        chrome.runtime.onMessage.addListener(handleMessage);
        chrome.storage.onChanged.addListener(handleStorageChange);

        // Update UI according to read options
        updateUiAfterOptionsUpdate(options);

        // Get TabInfo and update UI accordingly
        opnd.browser.requestTabInfoFromCurrentTab()
            .then(updateUiAfterTabInfoUpdate)
            .catch((error) => {
                // ignore: is logged anyway
                // TODO: is this necessary?: updateUiAfterTabInfoUpdate(null);
            })
    });

}

document.addEventListener("DOMContentLoaded", init);