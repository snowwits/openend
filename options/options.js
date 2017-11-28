const MESSAGE_DISPLAY_DURATION = 1000; // 1s

function addChannel() {
    const channelValue = getTextInputValue("sfm_channelToAdd");
    const selectElem = document.getElementById("sfm_channels");
    addSelectOption(selectElem, channelValue);

    console.log("SELECT: %O", selectElem);
}

function removeChannels() {
    removeSelectedOptions("sfm_channels");
}

// Saves options to chrome.storage.sync.
function saveOptions() {
    // Store option values to storage
    chrome.storage.sync.set(getOptionsFromInputValues(), function () {
        showStatusMsg(chrome.i18n.getMessage("options_save_successMsg"));
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreStoredOptions() {
    // Read option values from storage
    chrome.storage.sync.get(getDefaultOptionsCopy(), function (items) {
        console.log(chrome.runtime.lastError);
        setOptionsToInputValues(items);
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreDefaultOptions() {
    setOptionsToInputValues(getDefaultOptionsCopy());
    showStatusMsg(chrome.i18n.getMessage("options_restoreDefaults_successMsg"));
}

function getOptionsFromInputValues() {
    return {
        sfmActive: getRadioValue("sfm_active"),
        sfmChannels: getSelectOptionValues("sfm_channels"),
        sfmPlayerHideDuration: getCheckboxValue("sfm_player_hideDuration"),
        sfmPlayerJumpDistance: getTextInputValue("sfm_player_jumpDistance"),
        sfmVideoListHideDuration: getCheckboxValue("sfm_videoList_hideDuration"),
        sfmVideoListHideTitle: getCheckboxValue("sfm_videoList_hideTitle"),
        sfmVideoListHidePreview: getCheckboxValue("sfm_videoList_hidePreview"),
        generalTheatreMode: getCheckboxValue("general_theatreMode"),
    };
}

function setOptionsToInputValues(options) {
    // Set option values to elements
    setRadioValues("sfm_active", options.sfmActive);
    setSelectOptions("sfm_channels", options.sfmChannels);
    setCheckboxValue("sfm_player_hideDuration", options.sfmPlayerHideDuration);
    setTextInputValue("sfm_player_jumpDistance", options.sfmPlayerJumpDistance);
    setCheckboxValue("sfm_videoList_hideDuration", options.sfmVideoListHideDuration);
    setCheckboxValue("sfm_videoList_hideTitle", options.sfmVideoListHideTitle);
    setCheckboxValue("sfm_videoList_hidePreview", options.sfmVideoListHidePreview);
    setCheckboxValue("general_theatreMode", options.generalTheatreMode);
}

function showStatusMsg(msg) {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.innerHTML = msg;
    setTimeout(function () {
        status.innerHTML = "";
    }, MESSAGE_DISPLAY_DURATION);
}

function init() {
    // Init elements
    // Activate Spoiler-Free Mode
    setMsgToInnerHtml("sfm_active-label", "options_sfm_activate");
    setMsgToInnerHtml("sfm_active_always-label", "options_sfm_activate_always");
    setMsgToInnerHtml("sfm_active_never-label", "options_sfm_activate_never");
    setMsgToInnerHtml("sfm_active_custom-label", "options_sfm_activate_custom");

    // SFM channels select
    setMsgToTitle("sfm_channels", "options_sfm_channels");
    const channelsSelect = document.getElementById("sfm_channels");

    // Channel to add text input
    setMsgToTitle("sfm_channelToAdd", "options_sfm_channelToAdd");

    // Add channel button
    setMsgToInnerHtml("sfm_addChannel", "options_sfm_addChannel");
    const addChannelBtn = document.getElementById("sfm_addChannel");
    addChannelBtn.onclick = addChannel;

    // Remove channels btn
    setMsgToInnerHtml("sfm_removeChannel", "options_sfm_removeChannels");
    const removeChannelsBtn = document.getElementById("sfm_removeChannel");
    removeChannelsBtn.onclick = removeChannels;

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
    setMsgToInnerHtml("sfm_videoList_hideDuration-label", "options_sfm_videoList_hideDuration");
    setMsgToInnerHtml("sfm_videoList_hideTitle-label", "options_sfm_videoList_hideTitle");
    setMsgToInnerHtml("sfm_videoList_hidePreview-label", "options_sfm_videoList_hidePreview");

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
}

document.addEventListener('DOMContentLoaded', init);

