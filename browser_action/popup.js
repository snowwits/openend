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
const AddRemoveMode = {
    ADD: "ADD",
    REMOVE: "REMOVE"
};


/*
 * ====================================================================================================
 * FUNCTIONS
 * ====================================================================================================
 */
/**
 *
 * @param tabInfo {?TabInfo}
 */
function updateUiAfterTabInfoUpdate(tabInfo) {
    log("Updating UI after tab info received: %o", tabInfo);

    let currentChannelText = tabInfo && TAB_INFO_CURRENT_CHANNEL_NAME in tabInfo ? tabInfo[TAB_INFO_CURRENT_CHANNEL_NAME] : TAB_INFO_CURRENT_CHANNEL_DEFAULT;
    let currentChannel = parseChannelFromQualifiedName(currentChannelText);

    // First hide the button (maybe show it again later)
    const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
    addRemoveChannelBtn.classList.add(OPND_HIDDEN_CLASS);
    addRemoveChannelBtn.dataset.channel = currentChannelText;

    const currentChannelSpan = document.getElementById("currentChannelLabel");
    if (currentChannel !== null) {
        currentChannelSpan.textContent = "Current channel: " + currentChannel.displayName;

        chrome.storage.sync.get(OPT_SFM_CHANNELS_NAME, function (items) {
            if (chrome.runtime.lastError) {
                error("Failed to read [%s] from [sync] storage: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }

            updateAddRemoveChannelBtnModeAndLabel(addRemoveChannelBtn, currentChannel.qualifiedName, items[OPT_SFM_CHANNELS_NAME]);

            addRemoveChannelBtn.classList.remove(OPND_HIDDEN_CLASS);
        });
    } else {
        currentChannelSpan.textContent = "Not on a channel page.";
    }
}

function updateUiAfterSyncStorageChange(changes) {
    // If the channels changed, may need to change the button mode and label
    if (OPT_SFM_CHANNELS_NAME in changes) {
        const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
        const currentChannelQualifiedName = addRemoveChannelBtn.dataset.channel;
        updateAddRemoveChannelBtnModeAndLabel(addRemoveChannelBtn, currentChannelQualifiedName, changes[OPT_SFM_CHANNELS_NAME].newValue);
    }
}

/**
 *
 * @param addRemoveChannelBtn {!Element} the add/remove button
 * @param currentChannelQualifiedName {!string} the qualified name of the current channel
 * @param sfmChannels {!Array.<string>} array qualified channel names (the {@link OPT_SFM_CHANNELS_NAME} option)
 */
function updateAddRemoveChannelBtnModeAndLabel(addRemoveChannelBtn, currentChannelQualifiedName, sfmChannels) {
    if (sfmChannels.includes(currentChannelQualifiedName)) {
        addRemoveChannelBtn.dataset.mode = AddRemoveMode.REMOVE;
        addRemoveChannelBtn.textContent = "Remove from Spoiler-free Mode channels";
    } else {
        addRemoveChannelBtn.dataset.mode = AddRemoveMode.ADD;
        addRemoveChannelBtn.textContent = "Add to Spoiler-free Mode channels";
    }
}

function handleAddRemoveChannelAction() {
    const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
    const channelQualifiedName = addRemoveChannelBtn.dataset.channel;
    if (channelQualifiedName && channelQualifiedName.length > 0) {
        const mode = addRemoveChannelBtn.dataset.mode;
        chrome.storage.sync.get({[OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT}, function (items) {
            if (chrome.runtime.lastError) {
                error("Failed to read option [%s]: %o", OPT_SFM_CHANNELS_NAME, chrome.runtime.lastError);
                return;
            }
            const channels = items[OPT_SFM_CHANNELS_NAME];
            let newChannels;
            if (AddRemoveMode.ADD === mode) {
                newChannels = sortedSetPlus(channels, channelQualifiedName);
            }
            else if (AddRemoveMode.REMOVE === mode) {
                newChannels = sortedSetMinus(channels, channelQualifiedName);
            }
            chrome.storage.sync.set({OPT_SFM_CHANNELS_NAME: newChannels}, function () {
                if (chrome.runtime.lastError) {
                    error("Failed to set option [%s] to [%o]: %o", OPT_SFM_CHANNELS_NAME, newChannels, chrome.runtime.lastError);
                    return;
                }
                log("Successfully stored new channels: %o", newChannels);
            })
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
 * @param {function(tabs.Tab)} callback called when current tab is found
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
        updateUiAfterSyncStorageChange(changes);
    }
}


/*
 * ====================================================================================================
 * INIT
 * ====================================================================================================
 */
function init() {
    const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
    addRemoveChannelBtn.onclick = handleAddRemoveChannelAction;

    const openOptionsBtn = document.getElementById("openOptionsBtn");
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("menu_open_options");
    openOptionsBtn.onclick = handleOpenOptionsAction;

    getCurrentTab(handleCurrentTabAvailable);

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.storage.onChanged.addListener(handleStorageChange);
}

document.addEventListener("DOMContentLoaded", init);