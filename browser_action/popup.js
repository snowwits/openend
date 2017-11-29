const AddRemoveMode = {
    ADD: "ADD",
    REMOVE: "REMOVE"
};

// TODO: Disinguish between different tabs (currently there is only one currentChannel item that is shared between tabs)
// Solution: content_script sends message to event script that knows the tab and can store the currentChannel with the tabId ([tabIdxyz]: {currentChannel: "playoverwatch"}. If a tab is removed, that entry needs to be removed as well. When the popup is opened it checks the local storage like it does now.

function updateUiAfterLocalStorageRead(items) {
    let currentChannelText = LCL_CURRENT_CHANNEL_NAME in items ? items[LCL_CURRENT_CHANNEL_NAME] : LCL_CURRENT_CHANNEL_DEFAULT;
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

document.addEventListener("DOMContentLoaded", () => {
    const addRemoveChannelBtn = document.getElementById("addRemoveChannelBtn");
    addRemoveChannelBtn.onclick = handleAddRemoveChannelAction;

    const openOptionsBtn = document.getElementById("openOptionsBtn");
    openOptionsBtn.innerHTML = chrome.i18n.getMessage("menu_open_options");
    openOptionsBtn.onclick = handleOpenOptionsAction;

    chrome.storage.local.get(LCL_CURRENT_CHANNEL_NAME, function (items) {
        if (chrome.runtime.lastError) {
            console.error("OPENEND: Failed to read [%s] from [local] storage: %s", LCL_CURRENT_CHANNEL_NAME, chrome.runtime.lastError);
            return;
        }
        updateUiAfterLocalStorageRead(items);
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        console.log("Storage changes %o in namespace [%s]", changes, namespace);
        if ("local" === namespace) {
            updateUiAfterLocalStorageRead({[LCL_CURRENT_CHANNEL_NAME]: changes[LCL_CURRENT_CHANNEL_NAME].newValue});
        } else if ("sync" === namespace) {
            updateUiAfterSyncStorageChange(changes);
        }
    });
})
;