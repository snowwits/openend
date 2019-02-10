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
const SFM_ENABLED_PLATFORM_CLS = "sfmEnabledPlatform";
const SFM_ENABLED_ON_PLATFORM_CLS = "sfmEnabledOnPlatform";

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
    opnd.browser.writeOptions(options).then(() => {
        showStatusMsg(chrome.i18n.getMessage("options_save_successMsg"));
    }).catch(() => {
        showStatusMsg(chrome.i18n.getMessage("options_save_errorMsg"));
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreStoredOptions() {
    // Read option values from storage
    opnd.browser.readOptions().then(updateInputsWithOptions);
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
    const sfmEnabledPlatformsContainerDiv = document.getElementById(SFM_ENABLED_PLATFORMS_ID);
    const enabledDivs = sfmEnabledPlatformsContainerDiv.getElementsByClassName(SFM_ENABLED_ON_PLATFORM_CLS);
    for (let i = 0; i < enabledDivs.length; i++) {
        const enabledDiv = enabledDivs[i];
        const platformName = getData(enabledDiv, DATA_PLATFORM_NAME);
        const sfmEnabled = enabledDiv.querySelector("select").value;
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
        const sfmEnabledPlatformsContainerDiv = document.getElementById(SFM_ENABLED_PLATFORMS_ID);

        /**
         * <div id="sfmEnabledPlatformsContainer">
         *     <div class="sfmEnabledPlatform" data-platformname="twitch.tv">Twitch (twitch.tv)</div>
         *     <div class="sfmEnabledOnPlatform" data-platformname="twitch.tv"><select>...</select></div>
         *     <div class="sfmEnabledPlatform" data-platformname="mlg.com">MLG (mlg.com)</div>
         *     <div class="sfmEnabledOnPlatform" data-platformname="mlg.com"><select>...</select></div>
         * </div>
         */
        for (let i = 0; i < ALL_PLATFORMS.length; i++) {
            const platform = ALL_PLATFORMS[i];
            const enabledDiv = sfmEnabledPlatformsContainerDiv.querySelector(".sfmEnabledOnPlatform[data-" + DATA_PLATFORM_NAME + "='" + platform.name + "']");
            if (enabledDiv) {
                const enabledSelect = enabledDiv.querySelector("select");
                enabledSelect.value = optSfmEnabledPlatforms[platform.name];
            }
            else {
                const newPlatformDiv = document.createElement("div");
                newPlatformDiv.classList.add(SFM_ENABLED_PLATFORM_CLS);
                setData(newPlatformDiv, DATA_PLATFORM_NAME, platform.name);
                const newPlatformLabel = document.createElement("label");
                newPlatformLabel.textContent = platform.verboseName;
                newPlatformDiv.appendChild(newPlatformLabel);
                sfmEnabledPlatformsContainerDiv.appendChild(newPlatformDiv);
                const newEnabledDiv = document.createElement("div");
                newEnabledDiv.classList.add(SFM_ENABLED_ON_PLATFORM_CLS);
                setData(newEnabledDiv, DATA_PLATFORM_NAME, platform.name);
                const newEnabledSelect = document.createElement("select");
                const enumValueToMsgKeyMap = buildEnumValueToMsgKeyMap(SfmEnabled, "options_sfmEnabled_onPlatform_");
                setSelectOptions(newEnabledSelect, enumValueToMsgKeyMap, platform.supportedSfmEnabledValues);
                newEnabledSelect.value = optSfmEnabledPlatforms[platform.name];
                newEnabledDiv.appendChild(newEnabledSelect);
                sfmEnabledPlatformsContainerDiv.appendChild((newEnabledDiv));
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
 * @return {?Channel} the parsed channel
 */
function parseChannel(channelQualifiedNameOrUrl) {
    // Try to parse the given channel as url and as qualified name
    let channel = Channel.parseFromQualifiedName(channelQualifiedNameOrUrl);
    if (channel) {
        return channel;
    }
    const dummyAnchor = createAnchor(channelQualifiedNameOrUrl);
    return Channel.parseFromUrl(dummyAnchor);
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
    setMsgToPlaceholder("sfmEnabledChannelToAdd", "options_sfmEnabled_channelToAdd_placeholder");

    // Add channel button
    setMsgToTextContent("sfmEnabledAddChannel", "options_sfmEnabled_addChannel");
    const sfmEnabledAddChannelBtn = document.getElementById("sfmEnabledAddChannel");

    // Set add channel action
    sfmEnabledAddChannelBtn.onclick = function handleAddChannelAction() {
        const channel = parseChannel(sfmEnabledChannelToAddInput.value);
        if (channel) {
            insertChannelInSortedSetSelect(sfmEnabledOnChannelsSelect, channel);
        } else {
            error("Failed to add channel: %s", sfmEnabledChannelToAddInput.value);
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
    setMsgToPlaceholder(SFM_CFG_PLAYER_JUMP_DISTANCE_ID, "options_sfmCfg_player_jumpDistance_placeholder");
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