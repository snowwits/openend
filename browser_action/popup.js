const AddRemoveMode = {
    ADD: "ADD",
    REMOVE: "REMOVE"
};

/**
 *
 * @param tabInfo {?TabInfo}
 */
function updateUiAfterTabInfoUpdate(tabInfo) {
    console.log("OPENEND: Updating UI after tab info received: %o", tabInfo);

    let currentChannelText = tabInfo && TAB_INFO_CURRENT_CHANNEL_NAME in tabInfo ? tabInfo[TAB_INFO_CURRENT_CHANNEL_NAME] : TAB_INFO_CURRENT_CHANNEL_DEFAULT;
    let currentChannel = parseChannelQualifiedName(currentChannelText);

    // First hide the button (maybe show it again later)
    const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
    addRemoveChannelBtn.classList.add(OPND_HIDDEN_CLASS);
    addRemoveChannelBtn.dataset.channel = currentChannelText;

    const currentChannelSpan = document.getElementById("currentChannelLabel");
    if (currentChannel !== null) {
        currentChannelSpan.textContent = "Current channel: " + currentChannel.displayName;

        chrome.storage.sync.get("sfmChannels", function (items) {
            if (chrome.runtime.lastError) {
                console.error("OPENEND: Failed to read [sfmChannels] from [sync] storage: %s", chrome.runtime.lastError);
                return;
            }

            updateAddRemoveChannelBtnModeAndLabel(addRemoveChannelBtn, currentChannel.qualifiedName, items.sfmChannels);

            addRemoveChannelBtn.classList.remove(OPND_HIDDEN_CLASS);
        });
    } else {
        currentChannelSpan.textContent = "Not on a channel page.";
    }
}

function updateUiAfterSyncStorageChange(changes) {
    // If the channels changed, may need to change the button mode and label
    if ("sfmChannels" in changes) {
        const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
        const currentChannelQualifiedName = addRemoveChannelBtn.dataset.channel;
        updateAddRemoveChannelBtnModeAndLabel(addRemoveChannelBtn, currentChannelQualifiedName, changes.sfmChannels.newValue);
    }
}

/**
 *
 * @param addRemoveChannelBtn {!Element} the add/remove button
 * @param currentChannelQualifiedName {!string} the qualified name of the current channel
 * @param sfmChannels {!Array.<string>} array qualified channel names (the sfmChannels option)
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
        if (AddRemoveMode.ADD === mode) {
            console.log("ADD %s", channelQualifiedName);
        }
        else if (AddRemoveMode.REMOVE === mode) {
            console.log("REMOVE %s", channelQualifiedName);
        }
    }
}

function handleOpenOptionsAction() {
    chrome.runtime.openOptionsPage(() => {
        if (chrome.runtime.lastError) {
            console.error("OPENEND: Failed to open the options page: %s", chrome.runtime.lastError);
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

document.addEventListener("DOMContentLoaded", () => {
    const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
    addRemoveChannelBtn.onclick = handleAddRemoveChannelAction;

    const openOptionsBtn = document.getElementById("openOptionsBtn");
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("menu_open_options");
    openOptionsBtn.onclick = handleOpenOptionsAction;

    getCurrentTab((tab) => {
        if(!tab.id){
            console.error("Current tab has no ID: %o", tab);
            return;
        }
        const tabInfoKey = createTabInfoKey(tab.id);
        console.log("OPENEND: tabInfoKey: %o", tabInfoKey);

        chrome.storage.local.get(tabInfoKey, function (items) {
            if (chrome.runtime.lastError) {
                console.error("OPENEND: Failed to read [%s] from [local] storage: %s", tabInfoKey, chrome.runtime.lastError);
                return;
            }
            updateUiAfterTabInfoUpdate(items[tabInfoKey]);
        });

        chrome.storage.onChanged.addListener(function (changes, namespace) {
            console.log("Storage changes %o in namespace [%s]", changes, namespace);
            if ("local" === namespace) {
                updateUiAfterTabInfoUpdate(changes[tabInfoKey].newValue);
            } else if ("sync" === namespace) {
                updateUiAfterSyncStorageChange(changes);
            }
        });
    });
});