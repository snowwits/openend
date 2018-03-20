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

/**
 * @param details {!RuntimeInstalledEvent}
 */
function handleInstalled(details) {
    if (details.reason === "install") {
        log("Installed Open End for the first time");
    } else if (details.reason === "update") {
        const thisVersion = chrome.runtime.getManifest().version;
        log("Updated Open End from " + details.previousVersion + " to " + thisVersion + "!");

        /*
         * Migrate from 0.2.1:
         * - Restore options whose keys changed
         */
        if ("0.2.1" === details.previousVersion) {
            const optSfmEnabledGlobalKey_v0_2_1 = "sfmEnabled";
            const optSfmEnabledChannelsKey_v0_2_1 = "sfmChannels";
            const optKeys_v_0_2_1 = [optSfmEnabledGlobalKey_v0_2_1, optSfmEnabledChannelsKey_v0_2_1];

            opnd.browser.readOptions(optKeys_v_0_2_1).then((items) => {
                const updatedOptions = {};
                if (optSfmEnabledGlobalKey_v0_2_1 in items) {
                    updatedOptions[OPT_SFM_ENABLED_GLOBAL_NAME] = items[optSfmEnabledGlobalKey_v0_2_1];
                }
                if (optSfmEnabledChannelsKey_v0_2_1 in items) {
                    updatedOptions[OPT_SFM_ENABLED_CHANNELS_NAME] = items[optSfmEnabledChannelsKey_v0_2_1];
                }
                return updatedOptions;
            }).then((updatedOptions) => {
                return Promise.all([updatedOptions, opnd.browser.removeOptions(optKeys_v_0_2_1)]);
            }).then(([updatedOptions,]) => {
                return opnd.browser.writeOptions(updatedOptions);
            });
        }
    }
}

/**
 *
 * @param request {!Message} the request
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(request, sender, sendResponse) {
    log("Received message [%o] from [%o]", request, sender);

    if (sender.tab.active !== true) {
        log("Ignoring message [%o] from [%o] because it did not came from the current tab", request, sender);
        return;
    }

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

log("Init background page");


// Check whether new version is installed
chrome.runtime.onInstalled.addListener(handleInstalled);

chrome.runtime.onMessage.addListener(handleMessage);
