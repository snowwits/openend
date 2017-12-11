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
        [OPT_SFM_ENABLED_NAME]: getRadioValue("sfm_enabled"),
        [OPT_SFM_CHANNELS_NAME]: getSelectOptionValues("sfm_channels"),
        [OPT_SFM_PLAYER_HIDE_DURATION_NAME]: getCheckboxValue("sfm_player_hideDuration"),
        [OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]: getTextInputValue("sfm_player_jumpDistance"),
        [OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]: getCheckboxValue("sfm_videoList_hideTitle"),
        [OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]: getCheckboxValue("sfm_videoList_hidePreview"),
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: getCheckboxValue("sfm_videoList_hideDuration"),
        [OPT_GENERAL_THEATRE_MODE_NAME]: getCheckboxValue("general_theatreMode"),
    };
}

/**
 *
 * @param options {!object} not necessarily all options, maybe just the ones which values changed
 */
function updateInputsWithOptions(options) {
    // Set option values to elements
    if (OPT_SFM_ENABLED_NAME in options) {
        setRadioValues("sfm_enabled", options[OPT_SFM_ENABLED_NAME]);
    }
    if (OPT_SFM_CHANNELS_NAME in options) {
        const channelsSelect = document.getElementById("sfm_channels");
        setOptionsToSortedSetSelect(channelsSelect, options[OPT_SFM_CHANNELS_NAME]);
    }
    if (OPT_SFM_PLAYER_HIDE_DURATION_NAME in options) {
        setCheckboxValue("sfm_player_hideDuration", options[OPT_SFM_PLAYER_HIDE_DURATION_NAME]);
    }
    if (OPT_SFM_PLAYER_JUMP_DISTANCE_NAME in options) {
        setTextInputValue("sfm_player_jumpDistance", options[OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]);
    }
    if (OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME in options) {
        setCheckboxValue("sfm_videoList_hideTitle", options[OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]);
    }
    if (OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME in options) {
        setCheckboxValue("sfm_videoList_hidePreview", options[OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]);
    }
    if (OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME in options) {
        setCheckboxValue("sfm_videoList_hideDuration", options[OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]);
    }
    if (OPT_GENERAL_THEATRE_MODE_NAME in options) {
        setCheckboxValue("general_theatreMode", options[OPT_GENERAL_THEATRE_MODE_NAME]);
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
 * @param channelString {!string} the input string
 * @return {?Channel} the parsed channel
 */
function parseChannel(channelString) {
    // Try to parse the given channel as url and as qualified name
    let channel = parseChannelFromQualifiedName(channelString);
    if (channel) {
        return channel;
    }
    const dummyAnchor = createAnchor(channelString);
    return parseChannelFromUrl(dummyAnchor);
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
    // Activate Spoiler-Free Mode
    setMsgToInnerHtml("sfm_enabled-label", "options_sfm_enabled");
    setMsgToInnerHtml("sfm_enabled_always-label", "options_sfm_enabled_always");
    setMsgToInnerHtml("sfm_enabled_never-label", "options_sfm_enabled_never");
    setMsgToInnerHtml("sfm_enabled_custom-label", "options_sfm_enabled_custom");

    // SFM channels select
    setMsgToTitle("sfm_channels", "options_sfm_channels");
    const channelsSelect = document.getElementById("sfm_channels");

    // Channel to add text input
    const channelToAddInput = document.getElementById("sfm_channelToAdd");
    setMsgToTitle("sfm_channelToAdd", "options_sfm_channelToAdd");

    // Add channel button
    setMsgToInnerHtml("sfm_addChannel", "options_sfm_addChannel");
    const addChannelBtn = document.getElementById("sfm_addChannel");

    // Set add channel action
    addChannelBtn.onclick = function handleAddChannelAction() {
        const channel = parseChannel(channelToAddInput.value);
        if (channel) {
            insertOptionInSortedSetSelect(channelsSelect, channel.qualifiedName);
        } else {
            error("Failed to add channel: %s", channelToAddInput.value);
        }
    };

    // Activate/Deactivate add channel btn based on channel input
    const handleChannelToAddChanged = () => {
        const channel = parseChannel(channelToAddInput.value);
        addChannelBtn.disabled = channel === null;
    };
    channelToAddInput.addEventListener("keyup", handleChannelToAddChanged);
    handleChannelToAddChanged();

    // Remove channels btn
    setMsgToInnerHtml("sfm_removeChannel", "options_sfm_removeChannels");
    const removeChannelsBtn = document.getElementById("sfm_removeChannel");

    // Set remove channels action
    removeChannelsBtn.onclick = function handleRemoveChannelsAction() {
        removeSelectedOptions(channelsSelect);
    };

    // Active/Deactivate remove channels btn based on channels selection
    const handleSelectedChannelsChange = () => {
        removeChannelsBtn.disabled = channelsSelect.selectedOptions.length === 0;
    };
    channelsSelect.onchange = handleSelectedChannelsChange;
    handleSelectedChannelsChange();

    // Configure Spoiler-Free Mode
    setMsgToInnerHtml("sfm_configure-label", "options_sfm_configure");
    // Player
    setMsgToInnerHtml("sfm_player-label", "options_sfm_player");
    setMsgToInnerHtml("sfm_player_hideDuration-label", "options_sfm_player_hideDuration");
    setMsgToInnerHtml("sfm_player_jumpDistance-label", "options_sfm_player_jumpDistance");
    // Video List
    setMsgToInnerHtml("sfm_videoList-label", "options_sfm_videoList");
    setMsgToInnerHtml("sfm_videoList_hideTitle-label", "options_sfm_videoList_hideTitle");
    setMsgToInnerHtml("sfm_videoList_hidePreview-label", "options_sfm_videoList_hidePreview");
    setMsgToInnerHtml("sfm_videoList_hideDuration-label", "options_sfm_videoList_hideDuration");

    // Twitch
    setMsgToInnerHtml("general-label", "options_general");
    setMsgToInnerHtml("general_theatreMode-label", "options_general_theatreMode");

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