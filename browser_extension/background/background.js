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

        if (requiresMigration(details.previousVersion, "0.3.0")) {
            migrateTo_v0_3_0();
        }
    }
}

/**
 *
 * @param previousVersion the previously installed version
 * @param breakingChangesVersion the version that introduced breaking changes that require migration
 * @return {boolean} true if migration is needed (previous version lower than breaking changes version or cannot be determined)
 */
function requiresMigration(previousVersion, breakingChangesVersion) {
    const comparisonResult = compareManifestVersions(previousVersion, breakingChangesVersion);
    return isNaN(comparisonResult) || comparisonResult < 0;
}


function migrateTo_v0_3_0() {
    log("Migrating to version >=0.3.0 (re-storing options sfmEnabled, sfmChannels under the new keys [%s, %s] and in the new format)", OPT_SFM_ENABLED_GLOBAL_NAME, OPT_SFM_ENABLED_CHANNELS_NAME);
    const optSfmEnabledGlobalKey_pre_v0_3_0 = "sfmEnabled";
    const optSfmEnabledChannelsKey_pre_v0_3_0 = "sfmChannels";
    const optKeys_pre_v0_3_0 = [optSfmEnabledGlobalKey_pre_v0_3_0, optSfmEnabledChannelsKey_pre_v0_3_0];

    opnd.browser.readOptions(optKeys_pre_v0_3_0).then((items) => {
        const updatedOptions = {};
        if (optSfmEnabledGlobalKey_pre_v0_3_0 in items) {
            const sfmEnabledGlobal = items[optSfmEnabledGlobalKey_pre_v0_3_0];
            log("Migrating option [%s] from [%s=%o] to [%s=%o]", OPT_SFM_ENABLED_GLOBAL_NAME, optSfmEnabledGlobalKey_pre_v0_3_0, sfmEnabledGlobal, OPT_SFM_ENABLED_GLOBAL_NAME, sfmEnabledGlobal);
            updatedOptions[OPT_SFM_ENABLED_GLOBAL_NAME] = sfmEnabledGlobal;
        }
        if (optSfmEnabledChannelsKey_pre_v0_3_0 in items) {
            // Channels were stored as an Array<String> of qualified names
            const channelQualifiedNames = items[optSfmEnabledChannelsKey_pre_v0_3_0];
            const channels = Channel.parseArrayFromQualifiedNames(channelQualifiedNames);
            const serializedChannels = Channel.serializeArray(channels);
            log("Migrating option [%s] from [%s=%o] to [%s=%o]", OPT_SFM_ENABLED_CHANNELS_NAME, optSfmEnabledChannelsKey_pre_v0_3_0, channelQualifiedNames, OPT_SFM_ENABLED_CHANNELS_NAME, serializedChannels);
            updatedOptions[OPT_SFM_ENABLED_CHANNELS_NAME] = serializedChannels;
        }
        return updatedOptions;
    }).then((updatedOptions) => {
        return Promise.all([updatedOptions, opnd.browser.removeOptions(optKeys_pre_v0_3_0)]);
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