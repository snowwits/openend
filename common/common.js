const SfmActive = {
    NEVER: "never",
    ALWAYS: "always",
    CUSTOM: "custom"
};

/**
 * The key for the local storage item "currentChannel". The value is the qualified name of the channel.
 * @type {string}
 */
const LCL_CURRENT_CHANNEL_NAME = "currentChannel";
const LCL_CURRENT_CHANNEL_DEFAULT = "";


/* Option Defaults */
const OPT_SFM_ACTIVE_DEFAULT = SfmActive.ALWAYS;
const OPT_SFM_CHANNELS_DEFAULT = [];
const OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT = true;
const OPT_SFM_PLAYER_JUMP_DISTANCE_DEFAULT = "2m";
const OPT_SFM_VIDEO_LIST_HIDE_DURATION_DEFAULT = true;
const OPT_SFM_VIDEO_LIST_HIDE_TITLE_DEFAULT = true;
const OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_DEFAULT = true;
const OPT_GENERAL_THEATRE_MODE_DEFAULT = false;

/**
 * The CSS class of Open End container div elements. To not interfere with the page CSS style, we wrap every element we want to hide in a custom container div and then hide that container.
 * @type {string}
 */
const OPND_CONTAINER_CLASS = "opnd-container";
/**
 * The CSS class that is added to Open End containers to hide them and thus their content.
 * @type {string}
 */
const OPND_HIDDEN_CLASS = "opnd-hidden";

/**
 * The ID of the Open End Player Toolbar.
 * @type {string}
 */
const OPND_PLAYER_TOOLBAR_ID = "opnd-player-toolbar";


const OPND_PLAYER_SHOW_HIDE_DURATION_BTN_ID = "opnd-player-show-hide-duration-btn";
const OPND_PLAYER_SHOW_HIDE_DURATION_IMG_ID = "opnd-player-show-hide-duration-img";
const OPND_PLAYER_SHOW_HIDE_DURATION_TOOLTIP_SPAN_ID = "opnd-player-show-hide-duration-tooltip";
const OPND_PLAYER_JUMP_DISTANCE_INPUT_ID = "opnd-player-jump-distance-input";
const OPND_PLAYER_JUMP_BACKWARD_BTN_ID = "opnd-player-jump-backward-btn";
const OPND_PLAYER_JUMP_BACKWARD_TOOLTIP_SPAN_ID = "opnd-player-jump-backward-tooltip";
const OPND_PLAYER_JUMP_FORWARD_BTN_ID = "opnd-player-jump-forward-btn";
const OPND_PLAYER_JUMP_FORWARD_TOOLTIP_SPAN_ID = "opnd-player-jump-forward-tooltip";

const DURATION_PATTERN = "^(?:(\\d+)|(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?)$";


/*
 * CLASS DECLARATIONS
 */
class Platform {
    /**
     * @returns {!string} the name
     */
    get name() {
        throw new Error("Not implemented");
    }

    /**
     * @returns {!string} the display name
     */
    get displayName() {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param channel {!Channel} the channel
     * @returns {!string} the full channel url
     */
    buildChannelUrl(channel) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param qualifiedChannelName {!string}
     */
    parseChannelQualifiedName(qualifiedChannelName) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param hostname {!string} hostname of the URL
     * @param pathname {!string} pathname of the URL
     * @returns {?Channel} the parsed Channel or null
     */
    parseChannelUrl(hostname, pathname) {
        throw new Error("Not implemented");
    }
}

const TWITCH_PLATFORM_CLS = class TwitchPlatform extends Platform {

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
    parseChannelQualifiedName(qualifiedChannelName) {
        const platformPrefix = this.name + "/";
        const isTwitchChannel = qualifiedChannelName.startsWith(platformPrefix);
        if (isTwitchChannel) {
            const channelName = qualifiedChannelName.substr(platformPrefix.length);
            return new Channel(this, channelName);
        }
        return null;
    }

    /**
     * TODO: make a general method that takes [hostname, pathname, maybe search] and returns the URL type {CHANNEL, CHANNEL_VIDEOS, CHANNEL_UNKNOWN_SUB_DIR, VIDEO, UNKNOWN} and relevant parts like [channelName, videoId, timeStamp]
     * "https://www.twitch.tv/playoverwatch"
     *
     * @override
     */
    parseChannelUrl(hostname, pathname) {
        // Host has to be twitch and no sub-host like "clips.twitch.tv" or "app.twitch.tv"
        if ("www.twitch.tv" !== hostname && "twitch.tv" !== hostname) {
            return null;
        }
        // "/directory" is a special path
        if ("/directory" === pathname) {
            return null;
        }
        if (new RegExp("^/[^/]+$").test(pathname)) {
            return new Channel(this, pathname.substring(1));
        }
        return null;
    }

    /**
     * "https://www.twitch.tv/playoverwatch/videos/all"
     *
     * @param url {!string} the channel URL to parse
     * @returns {?Channel} the parsed Channel or null
     */
    parseChannelVideosUrl(url) {
        const match = new RegExp("twitch.tv/([^/]+)/videos/all(?:/)?$").exec(url);
        if (match !== null) {
            return new Channel(this, match[1]);
        }
        return null;
    }
};

const TWITCH_PLATFORM = new TWITCH_PLATFORM_CLS();

/**
 *
 * @type {Array.<Platform>}
 */
const ALL_PLATFORMS = [TWITCH_PLATFORM];

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
 * @returns {?Channel} the parsed Channel or null if no platform could parse the qualified name
 */
function parseChannelQualifiedName(channelQualifiedName) {
    for (let i = 0; i < ALL_PLATFORMS.length; i++) {
        const channel = ALL_PLATFORMS[i].parseChannelQualifiedName(channelQualifiedName);
        if (channel !== null) {
            return channel;
        }
    }
    return null;
}

/*
 * FUNCTIONS
 */
function getDefaultOptionsCopy() {
    return {
        sfmActivate: OPT_SFM_ACTIVE_DEFAULT,
        sfmChannels: OPT_SFM_CHANNELS_DEFAULT,
        sfmPlayerHideDuration: OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT,
        sfmPlayerJumpDistance: OPT_SFM_PLAYER_JUMP_DISTANCE_DEFAULT,
        sfmVideoListHideDuration: OPT_SFM_VIDEO_LIST_HIDE_DURATION_DEFAULT,
        sfmVideoListHideTitle: OPT_SFM_VIDEO_LIST_HIDE_TITLE_DEFAULT,
        sfmVideoListHidePreview: OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_DEFAULT,
        generalTheatreMode: OPT_GENERAL_THEATRE_MODE_DEFAULT
    }
}

/**
 * Suffixes the given duration string with a "m" as single numbers are interpreted as minutes.
 *
 * @param durationString {!string}
 * @returns {!string}
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
 * @returns {!number} the duration in seconds (integer, 0 if no match)
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
 * @returns {!number} the parsed integer or 0
 */
function parseDurationPart(groups, index) {
    return typeof groups[index] !== "undefined" ? parseInt(groups[index]) : 0;
}

/**
 * 3723 = 1 * 60 * 60 + 2 * 60 + 3 -> "01h02m03s"
 *
 * @param duration {!number} the duration in seconds
 * @returns {!string}
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
 * @returns {[!number,!number,!number]}
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

function padLeft(number, width = 2, padChar = "0") {
    let str = number + "";
    while (str.length < width) {
        str = padChar + str;
    }
    return str;
}

/**
 *
 * @param classNames {Array.<string>} the class names
 * @returns {Array} all elements that have any of the specified class names
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

function setVisible(elements, visible) {
    for (let i = 0; i < elements.length; i++) {
        const opndContainer = getOrWrapInOpndContainer(elements[i]);
        if (visible) {
            opndContainer.classList.remove(OPND_HIDDEN_CLASS);
        } else {
            opndContainer.classList.add(OPND_HIDDEN_CLASS);
        }
    }
}

function getOrWrapInOpndContainer(element) {
    const container = getOpndContainer(element);
    if (container) {
        return container;
    }
    return wrapInOpndContainer(element);
}

function getOpndContainer(element) {
    const parent = element.parentNode;
    if (parent.classList.contains(OPND_CONTAINER_CLASS)) {
        return parent;
    }
    return null;
}

function wrap(element, wrapper) {
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
}

function wrapInOpndContainer(element) {
    return wrap(element, createOpndContainer())
}

function createOpndContainer() {
    const opndContainer = document.createElement('div');
    opndContainer.classList.add(OPND_CONTAINER_CLASS);
    return opndContainer;
}

/*
 * ====================================================================
 * Input element setter and retriever
 * ====================================================================
 */
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

function getSelectOptionValues(selectId) {
    const select = document.getElementById("sfm_channels");
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

/**
 *
 * @param selectId {string} the id of the select element
 * @param optionValues {Array.<string>} an array with all values
 */
function setSelectOptions(selectId, optionValues) {
    const selectElem = document.getElementById(selectId);
    clearSelectOptions(selectElem);
    for (let i = 0; i < optionValues.length; i++) {
        const optionValue = optionValues[i];
        addSelectOption(selectElem, optionValue);
    }
}

function clearSelectOptions(selectElem) {
    selectElem.options.length = 0;
}

function addSelectOption(selectElem, optionValue) {
    const optionElem = document.createElement("option");
    optionElem.value = optionValue;
    optionElem.innerHTML = optionValue;
    selectElem.add(optionElem);
}

function removeSelectedOptions(selectId) {
    const selectElem = document.getElementById(selectId);
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