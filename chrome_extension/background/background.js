/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function log(msg, ...substitutions) {
    logWithComponent("background", msg, ...substitutions);
}

function warn(msg, ...substitutions) {
    warnWithComponent("background", msg, ...substitutions);
}

function error(msg, ...substitutions) {
    errorWithComponent("background", msg, ...substitutions);
}


/*
 * ====================================================================================================
 * FUNCTIONS
 * ====================================================================================================
 */
/**
 * @param details {!RuntimeInstalledEvent}
 */
function handleInstalled(details) {
    const thisVersion = chrome.runtime.getManifest().version;
    if (details.reason === "install") {
        log("Installed Open End version [%s] for the first time", thisVersion);
    } else if (details.reason === "update") {
        log("Updated Open End from version [%s] to [%s]", details.previousVersion, thisVersion);

        if ("0.2.1" === details.previousVersion) {
            migrateFrom_v0_2_1();
        }
    }
}

function migrateFrom_v0_2_1() {
    log("Migrating from version 0.2.1 (re-store options whose keys changed under the new keys)");
    const optSfmEnabledGlobalKey_v0_2_1 = "sfmEnabled";
    const optSfmEnabledChannelsKey_v0_2_1 = "sfmChannels";
    const optKeys_v0_2_1 = [optSfmEnabledGlobalKey_v0_2_1, optSfmEnabledChannelsKey_v0_2_1];

    opnd.browser.readOptions(optKeys_v0_2_1).then((items) => {
        const updatedOptions = {};
        if (optSfmEnabledGlobalKey_v0_2_1 in items) {
            updatedOptions[OPT_SFM_ENABLED_GLOBAL_NAME] = items[optSfmEnabledGlobalKey_v0_2_1];
        }
        if (optSfmEnabledChannelsKey_v0_2_1 in items) {
            updatedOptions[OPT_SFM_ENABLED_CHANNELS_NAME] = items[optSfmEnabledChannelsKey_v0_2_1];
        }
        return updatedOptions;
    }).then((updatedOptions) => {
        return Promise.all([updatedOptions, opnd.browser.removeOptions(optKeys_v0_2_1)]);
    }).then(([updatedOptions,]) => {
        return opnd.browser.writeOptions(updatedOptions);
    });
}

/**
 *
 * @param request {!Message} the request
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(request, sender, sendResponse) {
    log("Received message [%o] from [%o]", request, sender);

    if (request.type === MessageType.TAB_INFO) {
        const tabInfo = request.body;
        const tabId = sender.tab.id;

        const iconColor = (tabInfo.platform !== null ? "twitch-purple" : "grey");
        chrome.browserAction.setIcon({
            path: {
                "16": "img/icon_" + iconColor + "_16.png",
                "32": "img/icon_" + iconColor + "_32.png",
                "64": "img/icon_" + iconColor + "_64.png",
                "128": "img/icon_" + iconColor + "_128.png"
            },
            tabId: tabId
        });

        const badgeText = (SfmState.ACTIVE === tabInfo.sfmState ? chrome.i18n.getMessage("popup_sfmState_sfmBadge") : "");
        chrome.browserAction.setBadgeText({
            text: badgeText,
            tabId: tabId
        });

        return;
    }

    log("Ignoring message [%o] from [%o] because it has an irrelevant message type [%s]", request, sender, request.type);
}


/*
 * ====================================================================================================
 * INITIALIZATION
 * ====================================================================================================
 */
log("Init background page");
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);