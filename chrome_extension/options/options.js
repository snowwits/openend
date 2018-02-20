/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function log(msg, ...substitutions) {
    logWithComponent("options", msg, ...substitutions);
}

function warn(msg, ...substitutions) {
    warnWithComponent("options", msg, ...substitutions);
}

function error(msg, ...substitutions) {
    errorWithComponent("options", msg, ...substitutions);
}


/*
 * ====================================================================================================
 * CONSTANTS
 * ====================================================================================================
 */
const MESSAGE_DISPLAY_DURATION = 1000; // 1s

const SFM_ENABLED_GLOBAL_ID = "sfmEnabledGlobal";
const SFM_ENABLED_PLATFORMS_ID = "sfmEnabledPlatforms";
const SFM_ENABLED_CHANNELS_ID = "sfmEnabledChannels";
const SFM_CFG_PLAYER_HIDE_DURATION_ID = "sfmCfgPlayerHideDuration";
const SFM_CFG_PLAYER_JUMP_DISTANCE_ID = "sfmCfgPlayerJumpDistance";
const SFM_CFG_VIDEO_LIST_HIDE_TITLE_ID = "sfmCfgVideoListHideTitle";
const SFM_CFG_VIDEO_LIST_HIDE_PREVIEW_ID = "sfmCfgVideoListHidePreview";
const SFM_CFG_VIDEO_LIST_HIDE_DURATION_ID = "sfmCfgVideoListHideDuration";
const GENERAL_THEATRE_MODE_ID = "generalTheatreMode";

/*
 * ====================================================================================================
 * FUNCTIONS
 * ====================================================================================================
 */

// Saves options to chrome.storage.sync.
function saveOptions() {
    // Store option values to storage
    const options = getOptionsFromInputValues();
    chrome.storage.sync.set(options, function () {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to set options [%o]: %o", options, chrome.runtime.lastError);
            showStatusMsg(chrome.i18n.getMessage("options_save_errorMsg"));
            return;
        }
        log("[sync storage] Set options: %o", options);
        showStatusMsg(chrome.i18n.getMessage("options_save_successMsg"));
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreStoredOptions() {
    // Read option values from storage
    chrome.storage.sync.get(getDefaultOptionsCopy(), function (items) {
        if (chrome.runtime.lastError) {
            error("[sync storage] Failed to get options: %o", chrome.runtime.lastError);
            return;
        }
        log("[sync storage] Gotten options: %o", items);
        updateInputsWithOptions(items);
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreDefaultOptions() {
    updateInputsWithOptions(getDefaultOptionsCopy());
    showStatusMsg(chrome.i18n.getMessage("options_restoreDefaults_successMsg"));
}

function getOptionsFromInputValues() {
    return {
        [OPT_SFM_ENABLED_GLOBAL_NAME]: document.getElementById(SFM_ENABLED_GLOBAL_ID).value,
        [OPT_SFM_ENABLED_PLATFORMS_NAME]: getSfmEnabledPlatformsFromInputValues(),
        [OPT_SFM_ENABLED_CHANNELS_NAME]: getSelectChannelsSerialized(SFM_ENABLED_CHANNELS_ID),
        [OPT_SFM_PLAYER_HIDE_DURATION_NAME]: getCheckboxValue(SFM_CFG_PLAYER_HIDE_DURATION_ID),
        [OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]: getTextInputValue(SFM_CFG_PLAYER_JUMP_DISTANCE_ID),
        [OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]: getCheckboxValue(SFM_CFG_VIDEO_LIST_HIDE_TITLE_ID),
        [OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]: getCheckboxValue(SFM_CFG_VIDEO_LIST_HIDE_PREVIEW_ID),
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: getCheckboxValue(SFM_CFG_VIDEO_LIST_HIDE_DURATION_ID),
        [OPT_GENERAL_THEATRE_MODE_NAME]: getCheckboxValue(GENERAL_THEATRE_MODE_ID),
    };
}

function getSfmEnabledPlatformsFromInputValues() {
    const sfmEnabledPlatforms = {};
    const sfmEnabledPlatformsUl = document.getElementById(SFM_ENABLED_PLATFORMS_ID);
    const items = sfmEnabledPlatformsUl.getElementsByTagName("li");
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const platformName = getData(item.querySelector(".sfmEnabledPlatform"), "platformName");
        const sfmEnabled = item.querySelector(".sfmEnabledOnPlatform").value;
        sfmEnabledPlatforms[platformName] = sfmEnabled;
    }
    return sfmEnabledPlatforms;
}

/**
 *
 * @param options {!object} not necessarily all options, maybe just the ones which values changed
 */
function updateInputsWithOptions(options) {
    // Set option values to elements
    if (OPT_SFM_ENABLED_GLOBAL_NAME in options) {
        const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
        sfmEnabledGlobalSelect.value = options[OPT_SFM_ENABLED_GLOBAL_NAME];
    }
    if (OPT_SFM_ENABLED_PLATFORMS_NAME in options) {
        const optSfmEnabledPlatforms = getOptSfmEnabledPlatforms(options);
        const sfmEnabledPlatformsUl = document.getElementById(SFM_ENABLED_PLATFORMS_ID);

        /**
         *
         * <li>
         *     <span class="sfmEnabledPlatform" data-platform-name="twitch.tv">Twitch.tv</span>
         *     <select class="sfmEnabledOnPlatform">...</select>
         * </li>
         */
        for (let i=0; i<ALL_PLATFORMS.length; i++) {
            const platform = ALL_PLATFORMS[i];
            const platformSpan = sfmEnabledPlatformsUl.querySelector(".sfmEnabledPlatform[data-platform-name='" + platform.name + "']");
            console.log("%o", platformSpan);
            if (platformSpan) {
                const enabledSelect = platformSpan.parentElement.querySelector(".sfmEnabledOnPlatform");
                enabledSelect.value = optSfmEnabledPlatforms[platform.name];
            }
            else {
                const newItem = document.createElement("li");
                const newPlatformSpan = document.createElement("span");
                newPlatformSpan.classList.add("sfmEnabledPlatform");
                setData(newPlatformSpan, "platformName", platform.name);
                newPlatformSpan.textContent = platform.verboseName;
                newItem.appendChild(newPlatformSpan);
                const newEnabledSelect = document.createElement("select");
                newEnabledSelect.classList.add("sfmEnabledOnPlatform");
                setSelectOptions(newEnabledSelect, buildEnumValueToMsgKeyMap(SfmEnabled, "options_sfmEnabled_onPlatform_"));
                newEnabledSelect.value = optSfmEnabledPlatforms[platform.name];
                newItem.appendChild((newEnabledSelect));
                sfmEnabledPlatformsUl.appendChild(newItem);
            }
        }
    }
    if (OPT_SFM_ENABLED_CHANNELS_NAME in options) {
        const sfmEnabledChannelsSelect = document.getElementById(SFM_ENABLED_CHANNELS_ID);
        const channels = getOptSfmEnabledChannels(options).map(chSerialized => Channel.deserialize(chSerialized));
        setChannelsToSortedSetSelect(sfmEnabledChannelsSelect, channels);
    }
    if (OPT_SFM_PLAYER_HIDE_DURATION_NAME in options) {
        setCheckboxValue(SFM_CFG_PLAYER_HIDE_DURATION_ID, options[OPT_SFM_PLAYER_HIDE_DURATION_NAME]);
    }
    if (OPT_SFM_PLAYER_JUMP_DISTANCE_NAME in options) {
        setTextInputValue(SFM_CFG_PLAYER_JUMP_DISTANCE_ID, options[OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]);
    }
    if (OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME in options) {
        setCheckboxValue(SFM_CFG_VIDEO_LIST_HIDE_TITLE_ID, options[OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]);
    }
    if (OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME in options) {
        setCheckboxValue(SFM_CFG_VIDEO_LIST_HIDE_PREVIEW_ID, options[OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]);
    }
    if (OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME in options) {
        setCheckboxValue(SFM_CFG_VIDEO_LIST_HIDE_DURATION_ID, options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]);
    }
    if (OPT_GENERAL_THEATRE_MODE_NAME in options) {
        setCheckboxValue(GENERAL_THEATRE_MODE_ID, options[OPT_GENERAL_THEATRE_MODE_NAME]);
    }
}

function showStatusMsg(msg) {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.innerHTML = msg;
    setTimeout(function () {
        status.innerHTML = "";
    }, MESSAGE_DISPLAY_DURATION);
}

/**
 *
 * @param channelQualifiedNameOrUrl {!string} the qualified name of the channel or the channel URL
 * @param channelDisplayName {?string} the display name
 * @return {?Channel} the parsed channel
 */
function parseChannel(channelQualifiedNameOrUrl, channelDisplayName = null) {
    // Try to parse the given channel as url and as qualified name
    let channel = Channel.parseFromQualifiedName(channelQualifiedNameOrUrl, channelDisplayName);
    if (channel) {
        return channel;
    }
    const dummyAnchor = createAnchor(channelQualifiedNameOrUrl);
    return Channel.parseFromUrl(dummyAnchor, channelDisplayName);
}

/**
 * Handles changes to the options that were made outside of the options window
 * @param changes
 * @param namespace
 */
function handleStorageChange(changes, namespace) {
    log("[%s storage] Changes: %o", namespace, changes);
    if ("sync" === namespace) {
        updateInputsWithOptions(mapOptionChangesToItems(changes));
    }
}


/*
 * ====================================================================================================
 * INIT
 * ====================================================================================================
 */
function init() {
    // Init elements

    // title
    const allTitles = document.getElementsByTagName("title");
    for (let i = 0; i < allTitles.length; i++) {
        allTitles[i].textContent = chrome.i18n.getMessage("options_title");
    }

    // sfmEnabled
    setMsgToTextContent("sfmEnabledLabel", "options_sfmEnabled");

    // sfmEnabled_global
    setMsgToTextContent("sfmEnabledGlobalLabel", "options_sfmEnabled_global");
    const sfmEnabledGlobalSelect = document.getElementById(SFM_ENABLED_GLOBAL_ID);
    setSelectOptions(sfmEnabledGlobalSelect, buildEnumValueToMsgKeyMap(SfmEnabled, "options_sfmEnabled_global_"));

    // sfmEnabled_onPlatforms
    setMsgToTextContent("sfmEnabledPlatformsLabel", "options_sfmEnabled_platforms");

    // sfmEnabled_onChannels
    setMsgToTextContent("sfmEnabledChannelsLabel", "options_sfmEnabled_channels");
    const sfmEnabledOnChannelsSelect = document.getElementById(SFM_ENABLED_CHANNELS_ID);

    // Channel to add text input
    setMsgToTextContent("sfmEnabledChannelToAddLabel", "options_sfmEnabled_channelToAdd");
    const sfmEnabledChannelToAddInput = document.getElementById("sfmEnabledChannelToAdd");
    setMsgToTitle("sfmEnabledChannelToAdd", "options_sfm_channelToAdd");

    setMsgToTextContent("sfmEnabledChannelToAddDisplayNameLabel", "options_sfmEnabled_channelToAddDisplayName");
    const sfmEnabledChannelToAddDisplayNameInput = document.getElementById("sfmEnabledChannelToAddDisplayName");

    // Add channel button
    setMsgToTextContent("sfmEnabledAddChannel", "options_sfmEnabled_addChannel");
    const sfmEnabledAddChannelBtn = document.getElementById("sfmEnabledAddChannel");

    // Set add channel action
    sfmEnabledAddChannelBtn.onclick = function handleAddChannelAction() {
        const channel = parseChannel(sfmEnabledChannelToAddInput.value, getAttr(sfmEnabledChannelToAddDisplayNameInput, "value"));
        if (channel) {
            insertChannelInSortedSetSelect(sfmEnabledOnChannelsSelect, channel);
        } else {
            error("Failed to add channel: %s, %s", sfmEnabledChannelToAddInput.value, sfmEnabledChannelToAddDisplayNameInput.value);
        }
    };

    // Activate/Deactivate add channel btn based on channel input
    const handleChannelToAddChanged = () => {
        const channel = parseChannel(sfmEnabledChannelToAddInput.value);
        sfmEnabledAddChannelBtn.disabled = channel === null;
    };
    sfmEnabledChannelToAddInput.addEventListener("keyup", handleChannelToAddChanged);
    handleChannelToAddChanged();

    // Remove channels btn
    setMsgToTextContent("sfmEnabledRemoveChannel", "options_sfmEnabled_removeChannels");
    const removeChannelsBtn = document.getElementById("sfmEnabledRemoveChannel");

    // Set remove channels action
    removeChannelsBtn.onclick = function handleRemoveChannelsAction() {
        removeSelectedOptions(sfmEnabledOnChannelsSelect);
    };

    // Active/Deactivate remove channels btn based on channels selection
    const handleSelectedChannelsChange = () => {
        removeChannelsBtn.disabled = sfmEnabledOnChannelsSelect.selectedOptions.length === 0;
    };
    sfmEnabledOnChannelsSelect.onchange = handleSelectedChannelsChange;

    // TODO: refactor into method observeMutations(target: Node, options: MutationObserverInit, callback: MutationCallback)
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            //console.log(mutation.type);
            handleSelectedChannelsChange();
        });
    });
    // Konfiguration des Observers
    const config = {childList: true};
    // eigentliche Observierung starten und Zielnode und Konfiguration übergeben
    observer.observe(sfmEnabledOnChannelsSelect, config);

    handleSelectedChannelsChange();

    // Configure Spoiler-Free Mode
    setMsgToTextContent("sfmCfgLabel", "options_sfmCfg");
    // Player
    setMsgToTextContent("sfmCfgPlayerLabel", "options_sfmCfg_player");
    setMsgToTextContent("sfmCfgPlayerHideDurationLabel", "options_sfmCfg_player_hideDuration");
    setMsgToTextContent("sfmCfgPlayerJumpDistanceLabel", "options_sfmCfg_player_jumpDistance");
    // Video List
    setMsgToTextContent("sfmCfgVideoListLabel", "options_sfmCfg_videoList");
    setMsgToTextContent("sfmCfgVideoListHideTitleLabel", "options_sfmCfg_videoList_hideTitle");
    setMsgToTextContent("sfmCfgVideoListHidePreviewLabel", "options_sfmCfg_videoList_hidePreview");
    setMsgToTextContent("sfmCfgVideoListHideDurationLabel", "options_sfmCfg_videoList_hideDuration");

    // Twitch
    setMsgToTextContent("generalLabel", "options_general");
    setMsgToTextContent("generalTheatreModeLabel", "options_general_theatreMode");

    // Controls
    const saveBtn = document.getElementById("save");
    saveBtn.innerHTML = chrome.i18n.getMessage("options_save");
    saveBtn.onclick = saveOptions;

    const restoreDefaultsBtn = document.getElementById("restoreDefaults");
    restoreDefaultsBtn.innerHTML = chrome.i18n.getMessage("options_restoreDefaults");
    restoreDefaultsBtn.onclick = restoreDefaultOptions;

    restoreStoredOptions();
    chrome.storage.onChanged.addListener(handleStorageChange);
}

document.addEventListener('DOMContentLoaded', init);