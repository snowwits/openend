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
 *
 * @param request {!Message} the request
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(request, sender, sendResponse) {
    log("Received message [%o] from [%o]", message, sender);

    if (sender.tab.active !== true) {
        log("Ignoring message [%o] from [%o] because it did not came from the current tab", request, sender);
        return;
    }
    if (request.type === MessageType.TAB_INFO) {
        const tabInfo = request.body;
        const iconColor = (tabInfo.platform !== null ? "twitch-purple" : "grey");
        log("Setting icon to %s", iconColor);
        chrome.browserAction.setIcon({
            path: {
                "16": "img/icon_" + iconColor + "_16.png",
                "32": "img/icon_" + iconColor + "_32.png",
                "64": "img/icon_" + iconColor + "_64.png",
                "128": "img/icon_" + iconColor + "_128.png"
            },
            tabId: sender.tab.id
        });
        return;
    }
    log("Ignoring message [%o] from [%o] because it has an irrelevant message type [%s]", request, sender, request.type);
}

log("Init background page");
chrome.runtime.onMessage.addListener(handleMessage);