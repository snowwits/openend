/*
 * ====================================================================================================
 * TYPE DEFINITIONS
 * ====================================================================================================
 */
/*
 * Chrome specific types:
 */
/**
 * @typedef {object} RemoveInfo
 * @property {!number} windowId (integer) The window whose tab is closed
 * @property {!boolean} isWindowClosing True when the tab is being closed because its window is being closed
 */


/*
 * ====================================================================================================
 * LOGGING
 * ====================================================================================================
 */
function logWithComponent(component, msg, ...substitutions) {
    console.log("OPND[" + component + "]: " + msg, ...substitutions);
}

function warnWithComponent(component, msg, ...substitutions) {
    console.warn("OPND[" + component + "]: " + msg, ...substitutions);
}

function errorWithComponent(component, msg, ...substitutions) {
    console.error("OPND[" + component + "]: " + msg, ...substitutions);
}


/*
 * ====================================================================================================
 * OPTIONS (SYNC STORAGE)
 * ====================================================================================================
 */
const SfmEnabled = Object.freeze({
    NEVER: "NEVER",
    ALWAYS: "ALWAYS",
    CUSTOM: "CUSTOM"
});

const OPT_SFM_ENABLED_NAME = "sfmEnabled";
const OPT_SFM_ENABLED_DEFAULT = SfmEnabled.ALWAYS;
const OPT_SFM_CHANNELS_NAME = "sfmChannels";
const OPT_SFM_CHANNELS_DEFAULT = Object.freeze([]);
const OPT_SFM_PLAYER_HIDE_DURATION_NAME = "sfmPlayerHideDuration";
const OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT = true;
const OPT_SFM_PLAYER_JUMP_DISTANCE_NAME = "sfmPlayerJumpDistance";
const OPT_SFM_PLAYER_JUMP_DISTANCE_DEFAULT = "2m";
const OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME = "sfmVideoListHideTitle";
const OPT_SFM_VIDEO_LIST_HIDE_TITLE_DEFAULT = true;
const OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME = "sfmVideoListHidePreview";
const OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_DEFAULT = true;
const OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME = "sfmVideoListHideDuration";
const OPT_SFM_VIDEO_LIST_HIDE_DURATION_DEFAULT = true;
const OPT_GENERAL_THEATRE_MODE_NAME = "generalTheatreMode";
const OPT_GENERAL_THEATRE_MODE_DEFAULT = false;

function getDefaultOptionsCopy() {
    return {
        [OPT_SFM_ENABLED_NAME]: OPT_SFM_ENABLED_DEFAULT,
        [OPT_SFM_CHANNELS_NAME]: OPT_SFM_CHANNELS_DEFAULT,
        [OPT_SFM_PLAYER_HIDE_DURATION_NAME]: OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT,
        [OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]: OPT_SFM_PLAYER_JUMP_DISTANCE_DEFAULT,
        [OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]: OPT_SFM_VIDEO_LIST_HIDE_TITLE_DEFAULT,
        [OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]: OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_DEFAULT,
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: OPT_SFM_VIDEO_LIST_HIDE_DURATION_DEFAULT,
        [OPT_GENERAL_THEATRE_MODE_NAME]: OPT_GENERAL_THEATRE_MODE_DEFAULT
    };
}

function mapOptionChangesToItems(changes) {
    const items = {};
    for (let key in changes) {
        items[key] = changes[key].newValue;
    }
    return Object.freeze(items);
}

/**
 *
 * @param optionName {!string} the option's name
 * @returns {!boolean} whether the option is a option to configure the Spoiler-Free mode (SFM)
 */
function isSfmOption(optionName) {
    return optionName.includes("sfm");
}

const SfmEnabledForChannel = Object.freeze({
    ENABLED: "ENABLED",
    DISABLED: "DISABLED",
    UNDETERMINED: "UNDETERMINED"
});

/**
 * @param options the options
 * @param channel {?Channel} the channel to check
 * @return {!string} {@link SfmEnabledForChannel}
 */
function isSfmEnabledForChannel(options, channel) {
    const sfmEnabled = options[OPT_SFM_ENABLED_NAME];
    if (SfmEnabled.ALWAYS === sfmEnabled) {
        return SfmEnabledForChannel.ENABLED;
    } else if (SfmEnabled.NEVER === sfmEnabled) {
        return SfmEnabledForChannel.DISABLED;
    } else if (SfmEnabled.CUSTOM) {
        if (channel !== null) {
            const sfmChannels = options[OPT_SFM_CHANNELS_NAME];
            if (sfmChannels.includes(channel.qualifiedName)) {
                return SfmEnabledForChannel.ENABLED;
            }
            else {
                return SfmEnabledForChannel.DISABLED;
            }
        }
        return SfmEnabledForChannel.UNDETERMINED;
    }
}


/*
 * ====================================================================================================
 * MESSAGE PASSING
 * ====================================================================================================
 */
/**
 * @typedef {object} Message
 * @property {!string} type the message type
 * @property {?object} body the message body
 */
/**
 * @typedef {object} TabInfo
 * @property {!string} currentChannel the qualified name of current channel of the tab
 */
/**
 * @typedef {object} TabInfoMessage
 * @property {!string} type the TabInfo message type {@link MSG_TYPE_TAB_INFO}
 * @property {!TabInfo} body the tab info {@link TabInfo}
 */
/**
 * @typedef {object} TabInfoRequestMessage
 * @property {!string} type the TabInfoReqest message type {@link MSG_TYPE_TAB_INFO_REQUEST}
 */

const MSG_TYPE_NAME = "type";
const MSG_TYPE_TAB_INFO_REQUEST = "tabInfoRequest";
const MSG_TYPE_TAB_INFO = "tabInfo";
const MSG_BODY_NAME = "body";

/**
 * The key for the local storage item "currentChannel". The value is the qualified name of the channel.
 * @type {string}
 */
const TAB_INFO_CURRENT_CHANNEL_NAME = "currentChannel";
const TAB_INFO_CURRENT_CHANNEL_DEFAULT = "";


/*
 * ====================================================================================================
 * ELEMENT IDS & CSS CLASSES
 * ====================================================================================================
 */
/**
 * The CSS class of Open End container elements. To not interfere with the page CSS style, we wrap every element we want to hide in a custom container element and then hide that container.
 * @type {string}
 */
const OPND_CONTAINER_CLASS = "opnd-container";
/**
 * The CSS class that is added to Open End containers to hide them and thus their content.
 * @type {string}
 */
const OPND_HIDDEN_CLASS = "opnd-hidden";
/**
 * The ID of the Open End player toolbar.
 * @type {string}
 */
const OPND_PLAYER_TOOLBAR_ID = "opnd-player-toolbar";
/**
 * The CSS class of Open End containers that wrap elements of the player which contain a video's duration or the seek bar.
 * @type {string}
 */
const OPND_CONTAINER_PLAYER_DURATION_CLASS = "opnd-container-player-duration";

/**
 * The CSS class of an Open End video ist item toolbar.
 * @type {string}
 */
const OPND_VIDEO_LIST_ITEM_TOOLBAR_CLASS = "opnd-video-list-item-toolbar";
/**
 * The CSS class of the Open End container of a video list item's title.
 * @type {string}
 */
const OPND_CONTAINER_VIDEO_LIST_ITEM_TITLE_CLASS = "opnd-container-video-list-item-title";
/**
 * The CSS class of the Open End container of a video list item's preview.
 * @type {string}
 */
const OPND_CONTAINER_VIDEO_LIST_ITEM_PREVIEW_CLASS = "opnd-container-video-list-item-preview";
/**
 * The CSS class of the Open End container of a video list item's duration.
 * @type {string}
 */
const OPND_CONTAINER_VIDEO_LIST_ITEM_DURATION_CLASS = "opnd-container-video-list-item-duration";

const OPND_PLAYER_SHOW_HIDE_DURATION_BTN_ID = "opnd-player-show-hide-duration-btn";
const OPND_PLAYER_SHOW_HIDE_DURATION_IMG_ID = "opnd-player-show-hide-duration-img";
const OPND_PLAYER_SHOW_HIDE_DURATION_TOOLTIP_SPAN_ID = "opnd-player-show-hide-duration-tooltip";
const OPND_PLAYER_JUMP_DISTANCE_INPUT_ID = "opnd-player-jump-distance-input";
const OPND_PLAYER_JUMP_BACKWARD_BTN_ID = "opnd-player-jump-backward-btn";
const OPND_PLAYER_JUMP_BACKWARD_TOOLTIP_SPAN_ID = "opnd-player-jump-backward-tooltip";
const OPND_PLAYER_JUMP_FORWARD_BTN_ID = "opnd-player-jump-forward-btn";
const OPND_PLAYER_JUMP_FORWARD_TOOLTIP_SPAN_ID = "opnd-player-jump-forward-tooltip";


/*
 * ====================================================================================================
 * STRING UTILS
 * ====================================================================================================
 */
function padLeft(number, width = 2, padChar = "0") {
    let str = number + "";
    while (str.length < width) {
        str = padChar + str;
    }
    return str;
}


/*
 * ====================================================================================================
 * DURATION UTILS
 * ====================================================================================================
 */
const DURATION_PATTERN = "^(?:(\\d+)|(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?)$";

/**
 * Suffixes the given duration string with a "m" as single numbers are interpreted as minutes.
 *
 * @param durationString {!string}
 * @return {!string}
 */
function normalizeDurationString(durationString) {
    if (new RegExp("^\\d+$").test(durationString)) {
        return durationString + "m"
    }
    return durationString;
}

/**
 * "01h02m03s" -> 1 * 60 * 60 + 2 * 60 + 3 = 3723
 * "2" -> "2m" -> 2 * 60 = 120
 *
 * @param durationString {!string}
 * @return {!number} the duration in seconds (integer, 0 if no match)
 */
function parseDuration(durationString) {
    if (durationString.length === 0) {
        return 0;
    }
    // Regex: Either a single number ("2") or a duration string "01h02m03s".
    // literal RegExp /.../ not working somehow
    const regexDuration = new RegExp(DURATION_PATTERN);
    const groups = regexDuration.exec(durationString);
    if (groups === null) {
        return 0;
    }
    // Interpret a single number as minutes
    const singleNumber = parseDurationPart(groups, 1);
    if (singleNumber > 0) {
        return singleNumber * 60;
    }
    const hours = parseDurationPart(groups, 2);
    const mins = parseDurationPart(groups, 3);
    const secs = parseDurationPart(groups, 4);
    return secs + mins * 60 + hours * 3600;
}

/**
 *
 * @param groups {!Array.<string>}
 * @param index {!number}
 * @return {!number} the parsed integer or 0
 */
function parseDurationPart(groups, index) {
    return typeof groups[index] !== "undefined" ? parseInt(groups[index]) : 0;
}

/**
 * 3723 = 1 * 60 * 60 + 2 * 60 + 3 -> "01h02m03s"
 *
 * @param duration {!number} the duration in seconds
 * @return {!string}
 */
function formatDuration(duration) {
    const parts = extractDurationParts(duration);
    let formatted = "";
    if (parts[0] > 0) {
        formatted += padLeft(parts[0]) + "h";
    }
    if (parts[1] > 0) {
        formatted += padLeft(parts[1]) + "m";
    }
    if (parts[2] > 0) {
        formatted += padLeft(parts[2]) + "s";
    }
    return formatted;
}

/**
 * 3723 = 1h, 2m, 3s -> [1, 2, 3]
 *
 * @param duration {!number}
 * @return {[!number,!number,!number]}
 */
function extractDurationParts(duration) {
    let amount = duration;
    // Calculate (and subtract) whole hours
    const hours = Math.floor(amount / 3600);
    amount -= hours * 3600;

    // Calculate (and subtract) whole minutes
    const mins = Math.floor(amount / 60);
    amount -= mins * 60;

    // What's left is seconds
    const secs = amount % 60;

    return [hours, mins, secs];
}


/*
 * ====================================================================================================
 * ELEMENT UTILS
 * ====================================================================================================
 */
/**
 *
 * @param classNames {Array.<string>} the class names
 * @return {Array} all elements that have any of the specified class names
 */
function getElementsByClassNames(classNames) {
    const allElements = [];
    for (let i = 0; i < classNames.length; i++) {
        const classes = document.getElementsByClassName(classNames[i]);
        for (let j = 0; j < classes.length; j++) {
            allElements.push(classes[j]);
        }
    }
    return allElements
}


function getSingleElementByClassName(className) {
    const elements = document.getElementsByClassName(className);
    if (elements.length === 1) {
        return elements[0];
    }
    return null;
}

function removeElements(elements) {
    // Iterate from end to start because it could be a live list and removing from it would change the indices
    for (let i = elements.length - 1; i >= 0; i--) {
        removeElement(elements[i])
    }
}

function removeElement(element) {
    element.parentNode.removeChild(element);
}

/**
 *
 * @param opndContainers {!Iterable.<Element>}
 * @param visible {?boolean} true, false or null (to toggle)
 * @return {?boolean} true if the elements were set visible, false if not. null if there were no elements
 */
function setVisible(opndContainers, visible) {
    let actuallySetVisible = visible;
    for (let i = 0; i < opndContainers.length; i++) {
        const opndContainer = opndContainers[i];
        if (actuallySetVisible === null) {
            // If the visible param is null,
            // we check the first element's visible state and use that to toggle all elements.
            actuallySetVisible = opndContainer.classList.contains(OPND_HIDDEN_CLASS)
        }
        if (actuallySetVisible) {
            opndContainer.classList.remove(OPND_HIDDEN_CLASS);
        } else {
            opndContainer.classList.add(OPND_HIDDEN_CLASS);
        }
    }
    return actuallySetVisible;
}

function getOrWrapAllInOpndContainers(elements, additionalClass = null) {
    const opndContainers = [];
    for (let i = 0; i < elements.length; i++) {
        opndContainers.push(getOrWrapInOpndContainer(elements[i], additionalClass));
    }
    return opndContainers;
}

function getOrWrapInOpndContainer(element, additionalClass = null) {
    const container = getOpndContainer(element);
    if (container) {
        return container;
    }
    return wrapInOpndContainer(element, additionalClass);
}

function getOpndContainer(element) {
    const parent = element.parentNode;
    if (parent.classList.contains(OPND_CONTAINER_CLASS)) {
        return parent;
    }
    return null;
}

function wrapInOpndContainer(element, additionalClass = null) {
    return wrap(element, createOpndContainer(additionalClass))
}

function createOpndContainer(additionalClass = null) {
    const opndContainer = document.createElement("span");
    opndContainer.classList.add(OPND_CONTAINER_CLASS);
    if (additionalClass !== null) {
        opndContainer.classList.add(additionalClass);
    }
    return opndContainer;
}

function wrap(element, wrapper) {
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
}

/**
 *
 * @param checkboxId the id of the checkbox element
 * @return {boolean}
 */
function getCheckboxValue(checkboxId) {
    return document.getElementById(checkboxId).checked;
}

/**
 *
 * @param textInputId the id of the text input element
 * @return {string}
 */
function getTextInputValue(textInputId) {
    return document.getElementById(textInputId).value;
}

/**
 *
 * @param radioName the name of all radio inputs in the group
 */
function getRadioValue(radioName) {
    return document.querySelector('input[name = "' + radioName + '"]:checked').value;
}

/**
 *
 * @param radioName {string} the name of all radio inputs in the group
 * @param selectedValue {string} the value of the selected radio
 */
function setRadioValues(radioName, selectedValue) {
    const allRadios = document.querySelectorAll('input[type="radio"][name = "' + radioName + '"]');
    for (let i = 0; i < allRadios.length; i++) {
        const radio = allRadios[i];
        radio.checked = radio.value === selectedValue;
    }
}

function listenForRadioChanges(radioName, changeHandler) {
    const allRadios = document.querySelectorAll('input[type="radio"][name = "' + radioName + '"]');
    for (let i = 0; i < allRadios.length; i++) {
        allRadios[i].onclick = changeHandler;
    }
}

function getSelectOptionValues(selectId) {
    const select = document.getElementById(selectId);
    const optionValues = [];
    for (let i = 0; i < select.length; i++) {
        const option = select[i];
        optionValues.push(option.value);
    }
    return optionValues;
}

/**
 *
 * @param checkboxId {string} the id of the checkbox element
 * @param checked {boolean} whether the checkbox should be checked
 */
function setCheckboxValue(checkboxId, checked) {
    document.getElementById(checkboxId).checked = checked;
}

/**
 *
 * @param textInputId {string} the id of the text input element
 * @param value {string} the value to set to the text input element
 */
function setTextInputValue(textInputId, value) {
    document.getElementById(textInputId).value = value;
}

/**
 *
 * @param selectElem {HTMLSelectElement} the select element
 * @param optionValues {!Array.<string>} an array with all values
 */
function setOptionsToSortedSetSelect(selectElem, optionValues) {
    clearSelectOptions(selectElem);
    optionValues.sort();
    for (let i = 0; i < optionValues.length; i++) {
        const optionElem = document.createElement("option");
        optionElem.value = optionValues[i];
        optionElem.innerHTML = optionValues[i];
        selectElem.appendChild(optionElem);
    }
}

function clearSelectOptions(selectElem) {
    selectElem.options.length = 0;
}

function insertOptionInSortedSetSelect(selectElem, optionValue) {
    const optionElem = document.createElement("option");
    optionElem.value = optionValue;
    optionElem.innerHTML = optionValue;
    // Make sure the value is not already present
    for (let i = 0; i < selectElem.options.length; i++) {
        const currentOptionElem = selectElem.options[i];
        if (currentOptionElem.value === optionElem.value) {
            return;
        }
    }
    // Insert it in the correct position
    for (let i = 0; i < selectElem.options.length; i++) {
        const currentOptionElem = selectElem.options[i];
        if (optionElem.value < currentOptionElem.value) {
            selectElem.add(optionElem, i);
            // Select the added option
            selectElem.selectedIndex = i;
            return;
        }
    }
    // If it was not added yet, it is because the select has no options yet
    selectElem.appendChild(optionElem);
    selectElem.selectedIndex = selectElem.options.length - 1;
}

/**
 *
 * @param selectElem {HTMLSelectElement} the select element
 */
function removeSelectedOptions(selectElem) {
    const removalIndices = [];
    for (let i = 0; i < selectElem.selectedOptions.length; i++) {
        removalIndices.push(selectElem.selectedOptions[i].index);
    }
    // Remove from end to start so the indices of the options to remove stay the same
    for (let i = removalIndices.length - 1; i >= 0; i--) {
        const removalIndex = removalIndices[i];
        selectElem.remove(removalIndex);
    }
}

/**
 *
 * @param labelId the id of the label element
 * @param messageName the message name of the localized label text
 */
function setMsgToInnerHtml(labelId, messageName) {
    document.getElementById(labelId).innerHTML = chrome.i18n.getMessage(messageName);
}

/**
 *
 * @param elementId the id of the element
 * @param messageName the message name of the localized title
 */
function setMsgToTitle(elementId, messageName) {
    document.getElementById(elementId).title = chrome.i18n.getMessage(messageName);
}

/**
 * Creates an anchor element that can be queried for:
 * <ul>
 *     <li>protocol</li>
 *     <li>port</li>
 *     <li>host</li>
 *     <li>hostname</li>
 *     <li>pathname</li>
 *     <li>search</li>
 *     <li>hash</li>
 *     </ul>
 * @param href {!string} url of the anchor
 * @return {!HTMLAnchorElement }
 */
function createAnchor(href) {
    const l = document.createElement("a");
    l.href = href;
    return l;
}


/*
 * ====================================================================================================
 * CHANNEL AND PLATFORM
 * ====================================================================================================
 */
/**
 * Source: https://www.reddit.com/r/Twitch/comments/32w5b2/username_requirements/cqf8yh0/
 * "letters, numbers, underscore, between 4 and 25 characters"
 * "cannot begin with underscore"
 *
 * @type {RegExp}
 */
const TWITCH_USERNAME_REGEX = new RegExp("^[a-zA-Z0-9][a-zA-Z0-9_]{3,24}$");

class Platform {
    /**
     * @return {!string} the name
     */
    get name() {
        throw new Error("Not implemented");
    }

    /**
     * @return {!string} the display name
     */
    get displayName() {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param channelName {!string} the name of the channel to create
     * @return {!Channel} the created channel
     * @throws error if the channel name is invalid on the platform
     */
    buildChannel(channelName) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param channel {!Channel} the channel
     * @return {!string} the full channel url
     */
    buildChannelUrl(channel) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param qualifiedChannelName {!string}
     */
    parseChannelFromQualifiedName(qualifiedChannelName) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param hostname {!string} the hostname of the url
     * @param pathname {!string} the pathname of the url
     * @param search {!string} the query string of the url
     */
    parseChannelFromUrl(hostname, pathname, search) {
        throw new Error("Not implemented");
    }
}

/* Global Page Type Flags */
const TwitchPageType = Object.freeze({
    /**
     * "https://www.twitch.tv"
     */
    ROOT: "ROOT",
    /**
     * "https://www.twitch.tv/playoverwatch"
     */
    CHANNEL: "CHANNEL",
    /**
     * "https://www.twitch.tv/playoverwatch/videos/all"
     */
    CHANNEL_VIDEOS: "CHANNEL_VIDEOS",
    /**
     * "https://www.twitch.tv/playoverwatch/..."
     */
    CHANNEL_UNKNOWN_SUB_DIR: "CHANNEL_UNKNOWN_SUB_DIR",
    /**
     * "https://www.twitch.tv/directory"
     */
    DIRECTORY: "DIRECTORY",
    /**
     * "https://www.twitch.tv/directory/..."
     * "https://www.twitch.tv/directory/game/Overwatch"
     */
    DIRECTORY_UNKNOWN_SUB_DIR: "DIRECTORY_UNKNOWN_SUB_DIR",

    /**
     * "https://www.twitch.tv/videos/187486679"
     */
    VIDEO: "VIDEO",

    /**
     * "https://app.twitch.tv/download"
     * "https://clips.twitch.tv/PiercingMoralOctopusUncleNox"
     */
    UNKNOWN: "UNKNOWN",
});


class TwitchPlatform extends Platform {
    /**
     * @override
     */
    get name() {
        return "twitch.tv";
    }

    /**
     * @override
     */
    get displayName() {
        return "Twitch.tv";
    }

    buildChannel(channelName) {
        if (TWITCH_USERNAME_REGEX.test(channelName)) {
            const channelNameLowerCase = channelName.toLowerCase();
            return new Channel(this, channelNameLowerCase);
        }
        throw new Error("The given channel name is not a valid channel name (regex: " + TWITCH_USERNAME_REGEX + ")");
    }

    /**
     * @override
     */
    buildChannelUrl(channel) {
        return "https://www.twitch.tv/" + channel.name;
    }

    /**
     * "twitch.tv/playoverwatch"
     *
     * @override
     */
    parseChannelFromQualifiedName(qualifiedChannelName) {
        const platformPrefix = this.name + "/";
        const isTwitchChannel = qualifiedChannelName.startsWith(platformPrefix);
        if (isTwitchChannel) {
            const channelName = qualifiedChannelName.substr(platformPrefix.length);
            try {
                return this.buildChannel(channelName);
            }
            catch (err) {
                return null;
            }
        }
        return null;
    }

    parseChannelFromUrl(hostname, pathname, search) {
        const pageType = TWITCH_PLATFORM.determinePage(hostname, pathname, search);
        if (pageType && pageType.channel) {
            return pageType.channel;
        }
        return null;
    }

    /**
     * @typedef {Object} PageTypeResult
     * @property {!string} pageType the page type
     * @property {?Channel} channel the channel if it was a channel or channel sub page
     * @property {?string} videoId the id of the video if it was a video page
     */

    /**
     * @param hostname the hostname
     * @param pathname the pathname
     * @param search the query string
     * @return {?PageTypeResult} the page type result or null if it isn't a twitch page
     */
    determinePage(hostname, pathname, search) {
        try {
            // For most content the host has to be twitch.tv
            if ("www.twitch.tv" === hostname || "twitch.tv" === hostname) {
                if ("/" === pathname) {
                    return {
                        pageType: TwitchPageType.ROOT
                    };
                }
                // "/directory" is a special path
                if ("/directory" === pathname || "/directory/" === pathname) {
                    return {
                        pageType: TwitchPageType.DIRECTORY
                    };
                }
                if (pathname.startsWith("/directory")) {
                    return {
                        pageType: TwitchPageType.DIRECTORY_UNKNOWN_SUB_DIR
                    };
                }
                let match = new RegExp("^/videos/(\\d+)(?:/)?$").exec(pathname);
                if (match !== null) {
                    return {
                        pageType: TwitchPageType.VIDEO,
                        videoId: match[1]
                    };
                }
                match = new RegExp("^/([^/]+)/videos/all(?:/)?$").exec(pathname);
                if (match !== null) {
                    return {
                        pageType: TwitchPageType.CHANNEL_VIDEOS,
                        channel: this.buildChannel(match[1])
                    };
                }
                match = new RegExp("^/([^/]+)(?:/)?$").exec(pathname);
                if (match !== null) {
                    return {
                        pageType: TwitchPageType.CHANNEL,
                        channel: this.buildChannel(match[1])
                    };
                }
                match = new RegExp("^/([^/]+)/.*$").exec(pathname);
                if (match !== null) {
                    return {
                        pageType: TwitchPageType.CHANNEL_UNKNOWN_SUB_DIR,
                        channel: this.buildChannel(match[1])
                    };
                }
                return {
                    pageType: TwitchPageType.UNKNOWN
                };
            } else if (hostname.includes("twitch.tv")) {
                // sub-hosts like "clips.twitch.tv" or "app.twitch.tv"
                return {
                    pageType: TwitchPageType.UNKNOWN
                };
            }
            return null;
        }
        catch (err) {
            // For example if the channel name is incorrect
            logWithComponent("common", "Failed to determine page: %o", err);
            return null;
        }
    }
}

const TWITCH_PLATFORM = Object.freeze(new TwitchPlatform());

/**
 *
 * @type {ReadonlyArray.<Platform>}
 */
const ALL_PLATFORMS = Object.freeze([TWITCH_PLATFORM]);

class Channel {
    /**
     *
     * @param platform {!Platform}
     * @param name {!string}
     */
    constructor(platform, name) {
        this.platform = platform;
        this.name = name;
    }

    get qualifiedName() {
        return this.platform.name + "/" + this.name;
    }


    get displayName() {
        return this.name + " (" + this.platform.displayName + ")";
    }

    get url() {
        this.platform.buildChannelUrl(this);
    }
}

/**
 *
 * @param channelQualifiedName the qualified name of the channel
 * @return {?Channel} the parsed Channel or null if no platform could parse the qualified name
 */
function parseChannelFromQualifiedName(channelQualifiedName) {
    for (let i = 0; i < ALL_PLATFORMS.length; i++) {
        const channel = ALL_PLATFORMS[i].parseChannelFromQualifiedName(channelQualifiedName);
        if (channel !== null) {
            return channel;
        }
    }
    return null;
}

/**
 *
 * @param hostname {!string} the hostname of the url
 * @param pathname {!string} the pathname of the url
 * @param search {!string} the query string of the url
 * @return {?Channel} the parsed Channel or null if no platform could parse the qualified name
 */
function parseChannelFromUrl(hostname, pathname, search) {
    for (let i = 0; i < ALL_PLATFORMS.length; i++) {
        const channel = ALL_PLATFORMS[i].parseChannelFromUrl(hostname, pathname, search);
        if (channel !== null) {
            return channel;
        }
    }
    return null;
}