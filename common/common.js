/* Option Defaults */
const OPT_HIDE_PROGRESS_DEFAULT = true;
const OPT_SEEK_AMOUNT_DEFAULT = "2m";
const OPT_HIDE_ALL_VIDEO_DURATIONS_DEFAULT = true;
const OPT_TWITCH_THEATRE_MODE_DEFAULT = false;

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
 * The CSS class of Open End toolbars.
 * @type {string}
 */
const OPND_TOOLBAR_CLASS = "opnd-toolbar";


/**
 * "01h02m03s" -> 1 * 60 * 60 + 2 * 60 + 3 = 3723
 *
 * @param durationString {string}
 * @returns {number} the duration in seconds (0 if no match)
 */
function parseDuration(durationString) {
    if (durationString.length === 0) {
        return 0;
    }
    // literal RegExp /.../ not working somehow
    const regexDuration = new RegExp("^(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?$");
    const groups = regexDuration.exec(durationString);
    if (groups === null) {
        return 0;
    }
    const hours = parseDurationPart(groups, 1);
    const mins = parseDurationPart(groups, 2);
    const secs = parseDurationPart(groups, 3);
    return secs + mins * 60 + hours * 60 * 60;
}

/**
 *
 * @param groups {Array.<string>}
 * @param index {Number}
 * @returns {Number}
 */
function parseDurationPart(groups, index) {
    return typeof groups[index] !== "undefined" ? parseInt(groups[index]) : 0;
}

/**
 * 3723 = 1 * 60 * 60 + 2 * 60 + 3 -> "01h02m03s"
 *
 * @param duration {Number} the duration in seconds
 * @returns {string}
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
 * @param duration {Number}
 * @returns {[Number,Number,Number]}
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