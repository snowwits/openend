// Saves options to chrome.storage.sync.
function saveOptions() {
    // Read option values from elements
    const playerHideDuration = document.getElementById("playerHideDuration").checked;
    const playerJumpDistance = document.getElementById("playerJumpDistance").value;
    const playerTheatreMode = document.getElementById("playerTheatreMode").checked;
    const videoListHideDuration = document.getElementById("videoListHideDuration").checked;
    const videoListHideTitle = document.getElementById("videoListHideTitle").checked;

    // Store option values to storage
    chrome.storage.sync.set({
        playerHideDuration: playerHideDuration,
        playerJumpDistance: playerJumpDistance,
        playerTheatreMode: playerTheatreMode,
        videoListHideDuration: videoListHideDuration,
        videoListHideTitle: videoListHideTitle
    }, function () {
        showStatusMsg(chrome.i18n.getMessage("options_save_successMsg"));
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreOptions() {
    // Read option values from storage
    chrome.storage.sync.get({
        playerHideDuration: OPT_PLAYER_HIDE_DURATION_DEFAULT,
        playerJumpDistance: OPT_PLAYER_JUMP_DISTANCE_DEFAULT,
        playerTheatreMode: OPT_PLAYER_THEATRE_MODE_DEFAULT,
        videoListHideDuration: OPT_VIDEO_LIST_HIDE_DURATION_DEFAULT,
        videoListHideTitle: OPT_VIDEO_LIST_HIDE_TITLE_DEFAULT
    }, function (items) {
        // Set option values to elements
        document.getElementById("playerHideDuration").checked = items.playerHideDuration;
        document.getElementById("playerJumpDistance").value = items.playerJumpDistance;
        document.getElementById("playerTheatreMode").checked = items.playerTheatreMode;
        document.getElementById("videoListHideDuration").checked = items.videoListHideDuration;
        document.getElementById("videoListHideTitle").checked = items.videoListHideTitle;
    });
}

// Restores option values using the preferences stored in chrome.storage.
function restoreDefaultOptions() {
    // Set option values to elements
    document.getElementById("playerHideDuration").checked = OPT_PLAYER_HIDE_DURATION_DEFAULT;
    document.getElementById("playerJumpDistance").value = OPT_PLAYER_JUMP_DISTANCE_DEFAULT;
    document.getElementById("playerTheatreMode").checked = OPT_PLAYER_THEATRE_MODE_DEFAULT;
    document.getElementById("videoListHideDuration").checked = OPT_VIDEO_LIST_HIDE_DURATION_DEFAULT;
    document.getElementById("videoListHideTitle").checked = OPT_VIDEO_LIST_HIDE_TITLE_DEFAULT;
    showStatusMsg(chrome.i18n.getMessage("options_restoreDefaults_successMsg"));
}

function showStatusMsg(msg) {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.innerHTML = msg;
    setTimeout(function () {
        status.innerHTML = "";
    }, 750);
}

// Init elements
// General
document.getElementById("generalLabel").innerHTML = chrome.i18n.getMessage("options_general");

// Player
document.getElementById("playerLabel").innerHTML = chrome.i18n.getMessage("options_player");
document.getElementById("playerHideDurationLabel").innerHTML = chrome.i18n.getMessage("options_player_hideDuration");
document.getElementById("playerJumpDistanceLabel").innerHTML = chrome.i18n.getMessage("options_player_jumpDistance");
document.getElementById("playerTheatreModeLabel").innerHTML = chrome.i18n.getMessage("options_player_theatreMode");

// Video List
document.getElementById("videoListLabel").innerHTML = chrome.i18n.getMessage("options_videoList");
document.getElementById("videoListHideDurationLabel").innerHTML = chrome.i18n.getMessage("options_videoList_hideDuration");
document.getElementById("videoListHideTitleLabel").innerHTML = chrome.i18n.getMessage("options_videoList_hideTitle");

// Twitch
document.getElementById("twitchLabel").innerHTML = chrome.i18n.getMessage("options_twitch");

// Controls
const saveBtn = document.getElementById("save");
saveBtn.innerHTML = chrome.i18n.getMessage("options_save");
saveBtn.onclick = saveOptions;

const restoreDefaultsBtn = document.getElementById("restoreDefaults");
restoreDefaultsBtn.innerHTML = chrome.i18n.getMessage("options_restoreDefaults");
restoreDefaultsBtn.onclick = restoreDefaultOptions;
document.addEventListener("DOMContentLoaded", restoreOptions);
