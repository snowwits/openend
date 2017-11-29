/**
 * This background event page acts as a broker between the content_script and the browser_action.
 * It receives TabInfo messages from the content script and stores the TabInfos with the corresponding tab id in the local storage.
 * Once the tab is closed, it removes the corresponding TabInfo from the local storage.
 */

/**
 *
 * @param request {!Message} the message
 * @param sender {!MessageSender} the sender
 * @param sendResponse {!function} the function to send the response
 */
function handleMessage(request, sender, sendResponse) {
    console.log("OPENEND[event_page]: Received message from [%o]: %o", sender, request);
    if (MSG_TYPE_NAME in request) {
        if (MSG_TYPE_TAB_INFO === request[MSG_TYPE_NAME] && sender.tab && sender.tab.id) {
            const tabInfoKey = createTabInfoKey(sender.tab.id);
            const tabInfoValue = request[MSG_BODY_NAME];
            chrome.storage.local.set({[tabInfoKey]: tabInfoValue}, function () {
                if (chrome.runtime.lastError) {
                    console.error("OPENEND[event_page]: [Local Storage] Failed to set [%s] to [%o]", tabInfoKey, tabInfoValue);
                }
                console.log("OPENEND[event_page]: [Local Storage] Set [%s] to [%o]", tabInfoKey, tabInfoValue);
            });
        }
    }
}

/**
 *
 * @param tabId {!number} (integer) the tab id
 * @param removeInfo {!RemoveInfo} further information
 */
function handleTabRemovedEvent(tabId, removeInfo) {
    console.log("OPENEND: Tab [%o] removed: %o", tabId, removeInfo);
    const tabInfoKey = createTabInfoKey(tabId);
    chrome.storage.local.remove(tabInfoKey, function () {
        if (chrome.runtime.lastError) {
            console.error("OPENEND[event_page]: [Local storage] Failed to remove [%s]", tabInfoKey);
        }
        console.log("OPENEND[event_page]: [Local Storage] Removed [%o]", tabInfoKey);
    })
}

// Init
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onRemoved.addListener(handleTabRemovedEvent);