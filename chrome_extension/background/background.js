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

        // TODO: Implement a function compareVersions(versionA, versionB)
        if ("0.3.0" !== details.previousVersion) {
            migrateFrom_v0_2_1();
        }
    }
}

function migrateFrom_v0_2_1() {
    log("Migrating from version 0.2.1 (re-storing options sfmEnabled, sfmChannels under the new keys and in the new format)");
    const optSfmEnabledGlobalKey_v0_2_1 = "sfmEnabled";
    const optSfmEnabledChannelsKey_v0_2_1 = "sfmChannels";
    const optKeys_v0_2_1 = [optSfmEnabledGlobalKey_v0_2_1, optSfmEnabledChannelsKey_v0_2_1];

    opnd.browser.readOptions(optKeys_v0_2_1).then((items) => {
        const updatedOptions = {};
        if (optSfmEnabledGlobalKey_v0_2_1 in items) {
            const sfmEnabledGlobal = items[optSfmEnabledGlobalKey_v0_2_1];
            log("Migrating option [%s] from [%s=%o] to [%s=%o]", OPT_SFM_ENABLED_GLOBAL_NAME, optSfmEnabledGlobalKey_v0_2_1, sfmEnabledGlobal, OPT_SFM_ENABLED_GLOBAL_NAME, sfmEnabledGlobal);
            updatedOptions[OPT_SFM_ENABLED_GLOBAL_NAME] = sfmEnabledGlobal;
        }
        if (optSfmEnabledChannelsKey_v0_2_1 in items) {
            // Channels were stored as an Array<String> of qualified names
            const channelQualifiedNames = items[optSfmEnabledChannelsKey_v0_2_1];
            const channels = Channel.parseArrayFromQualifiedNames(channelQualifiedNames);
            const serializedChannels = Channel.serializeArray(channels);
            log("Migrating option [%s] from [%s=%o] to [%s=%o]", OPT_SFM_ENABLED_CHANNELS_NAME, optSfmEnabledChannelsKey_v0_2_1, channelQualifiedNames, OPT_SFM_ENABLED_CHANNELS_NAME, serializedChannels);
            updatedOptions[OPT_SFM_ENABLED_CHANNELS_NAME] = serializedChannels;
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

        const sfmActiveOrPartlyActive = SfmState.ACTIVE === tabInfo.sfmState || SfmState.CHANNEL_DEPENDENT === tabInfo.sfmState;
        const badgeText = (sfmActiveOrPartlyActive ? chrome.i18n.getMessage("popup_sfmState_sfmBadge") : "");
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