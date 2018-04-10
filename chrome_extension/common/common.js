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

// TODO: disable before publishing
const LOG_ENABLED = true;

function logWithComponent(component, msg, ...substitutions) {
    if (LOG_ENABLED) {
        console.log("OPND[" + component + "]: " + msg, ...substitutions);
    }
}

function warnWithComponent(component, msg, ...substitutions) {
    console.warn("OPND[" + component + "]: " + msg, ...substitutions);
}

function errorWithComponent(component, msg, ...substitutions) {
    console.error("OPND[" + component + "]: " + msg, ...substitutions);
}


/*
 * ====================================================================================================
 * TECHNICAL PARAMETERS (may be exposed as technical options later)
 * ====================================================================================================
 */

const CHECK_PAGE_TASK_INTERVAL = 200; // 200ms
const PAGE_CONFIGURATION_TIMEOUT = 60000; // 60s


/*
 * ====================================================================================================
 * CHANNEL AND PLATFORM
 * ====================================================================================================
 */

/*
 * ====================================================================================================
 * CHANNEL AND PLATFORM - API
 * ====================================================================================================
 */

/*
 * No camelcase in data-names. CamelCase leads to two keys being
 */
const DATA_PLATFORM_NAME = "platformname";
const DATA_CHANNEL_QUALIFIED_NAME = "channelqualifiedname";
const DATA_CHANNEL_DISPLAY_NAME = "channeldisplayname";

class PlatformPage {
    /**
     *
     * @param pageType {!string} the page type
     * @param channel {?Channel} the channel if it is a channel or a channel sub page
     * @param videoId {?string} videoId the id of the video if it is a video page
     */
    constructor(pageType, channel = null, videoId = null) {
        this.pageType = pageType;
        this.channel = channel;
        this.videoId = videoId;
    }
}

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

    get verboseName() {
        return this.displayName + " (" + this.name + ")";
    }

    /**
     * @return {!ReadonlyArray<string>} the allowed {@link SfmEnabled} values
     */
    get supportedSfmEnabledValues() {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param platformName {?string} the name of the platform
     * @returns {?Platform} the parsed Platform or null if the given platformName does not match any platform
     */
    static parseFromName(platformName) {
        for (let i = 0; i < ALL_PLATFORMS.length; i++) {
            if (ALL_PLATFORMS[i].name === platformName) {
                return ALL_PLATFORMS[i];
            }
        }
        return null;
    }

    /**
     *
     * @param platform1 {!Platform|!PlatformSerialized}
     * @param platform2 {!Platform|!PlatformSerialized}
     * @return {!boolean}
     */
    static equal(platform1, platform2) {
        return platform1.name === platform2.name;
    }

    /**
     *
     * @param platform1 {!Platform}
     * @param platform2 {!Platform}
     * @return {!number}
     */
    static compareByVerboseName(platform1, platform2) {
        return compareStringIgnoreCase(platform1.verboseName, platform2.verboseName);
    }

    /**
     *
     * @param platformSerialized {?PlatformSerialized}
     * @return {?Platform}
     */
    static deserialize(platformSerialized) {
        if (platformSerialized) {
            return Platform.parseFromName(platformSerialized.name);
        }
        return null;
    }

    /**
     *
     * @param platformsSerialized {!Array.<!PlatformSerialized>}
     * @return {!Array.<!Platform>}
     */
    static deserializeArray(platformsSerialized) {
        return platformsSerialized.map(plSerialized => Platform.deserialize(plSerialized));
    }

    /**
     *
     * @param platforms {!Array.<!Platform>}
     * @return {!Array.<!PlatformSerialized>}
     */
    static serializeArray(platforms) {
        return platforms.map(pl => pl.serialize());
    }

    /**
     *
     * @param name {!string} the name of the channel to create
     * @param displayName {?string} the display name of the channel (may be null if it is the same as the name)
     * @return {!Channel} the created channel
     * @throws error if the channel name is invalid on the platform
     */
    buildChannel(name, displayName = null) {
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
     * @param qualifiedChannelName {?string}
     * @return {?Channel} the parsed channel or null if the qualified name is invalid for this platform
     */
    parseChannelFromQualifiedName(qualifiedChannelName) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param url {!URL} a {@link Location} or {@link HTMLAnchorElement}
     * @return {?Channel} the parsed channel or null if the URL was not recognized
     */
    parseChannelFromUrl(url) {
        throw new Error("Not implemented");
    }

    /**
     * @param url {!URL} a {@link Location} or {@link HTMLAnchorElement}
     * @return {?PlatformPage} the page or null if it isn't a page of that platform
     */
    parsePageFromUrl(url) {
        throw new Error("Not implemented");
    }

    serialize() {
        return new PlatformSerialized(this.name);
    }
}

class Channel {
    /**
     *
     * @param platform {!Platform}
     * @param name {!string}
     * @param displayName {?string} the display name of the channel
     */
    constructor(platform, name, displayName = null) {
        this.platform = platform;
        this.name = name;
        this.displayName = displayName;
    }

    get qualifiedName() {
        return this.platform.name + "/" + this.name;
    }

    get displayNameOrName() {
        return this.displayName !== null ? this.displayName : this.name;
    }

    get qualifiedDisplayNameOrName() {
        return this.platform.displayName + "/" + this.displayNameOrName;
    }

    get verboseName() {
        return this.displayNameOrName + " (" + this.qualifiedName + ")";
    }

    get verboseQualifiedName() {
        return this.qualifiedDisplayNameOrName + " (" + this.qualifiedName + ")";
    }

    get url() {
        this.platform.buildChannelUrl(this);
    }

    /**
     *
     * @param channelQualifiedName {!string} the qualified name of the channel
     * @param displayName {?string} the optional display name of the channel
     * @return {?Channel} the parsed Channel or null if no platform could parse the qualified name
     */
    static parseFromQualifiedName(channelQualifiedName, displayName = null) {
        for (let i = 0; i < ALL_PLATFORMS.length; i++) {
            const channel = ALL_PLATFORMS[i].parseChannelFromQualifiedName(channelQualifiedName);
            if (channel !== null) {
                channel.displayName = displayName;
                return channel;
            }
        }
        return null;
    }

    /**
     *
     * @param qualifiedNames {!Array<String>}
     * @return {!Array<!Channel>} the parsed channels (qualified names that could not be parsed are filtered out)
     */
    static parseArrayFromQualifiedNames(qualifiedNames) {
        return qualifiedNames.map(qualifiedName => Channel.parseFromQualifiedName(qualifiedName)).filter(channel => channel !== null);
    }

    /**
     *
     * @param url {!URL} a {@link Location} or {@link HTMLAnchorElement}
     * @param displayName {?string} the optional display name of the channel
     * @return {?Channel} the parsed channel or null if the URL was not recognized
     */
    static parseFromUrl(url, displayName = null) {
        for (let i = 0; i < ALL_PLATFORMS.length; i++) {
            const channel = ALL_PLATFORMS[i].parseChannelFromUrl(url);
            if (channel !== null) {
                channel.displayName = displayName;
                return channel;
            }
        }
        return null;
    }

    /**
     *
     * @param channel1 {!Channel|!ChannelSerialized}
     * @param channel2 {!Channel|!ChannelSerialized}
     * @return {!boolean}
     */
    static equal(channel1, channel2) {
        return channel1.qualifiedName === channel2.qualifiedName;
    }

    /**
     *
     * @param channel1 {!Channel}
     * @param channel2 {!Channel}
     * @return {!number}
     */
    static compareByVerboseQualifiedName(channel1, channel2) {
        return compareStringIgnoreCase(channel1.verboseQualifiedName, channel2.verboseQualifiedName);
    }

    /**
     *
     * @param channelSerialized {?ChannelSerialized}
     * @return {?Channel}
     */
    static deserialize(channelSerialized) {
        if (channelSerialized) {
            return Channel.parseFromQualifiedName(channelSerialized.qualifiedName, channelSerialized.displayName);
        }
        return null;
    }

    /**
     *
     * @param channelsSerialized {!Array.<!ChannelSerialized>}
     * @return {!Array.<!Channel>}
     */
    static deserializeArray(channelsSerialized) {
        return channelsSerialized.map(chSerialized => Channel.deserialize(chSerialized));
    }

    /**
     *
     * @param channels {!Array.<!Channel>}
     * @return {!Array.<!ChannelSerialized>}
     */
    static serializeArray(channels) {
        return channels.map(ch => ch.serialize());
    }

    serialize() {
        return new ChannelSerialized(this.qualifiedName, this.displayName);
    }
}

/**
 * @property {!string} name the name of the platform
 */
class PlatformSerialized {
    /**
     *
     * @param name {!string} the name of the platform
     */
    constructor(name) {
        this.name = name;
    }
}

/**
 * @property {!string} qualifiedName the qualified name of the channel
 * @property {?string} displayName the display name of the channel
 */
class ChannelSerialized {
    /**
     * @param {!string} qualifiedName the qualified name of the channel
     * @param {?string} displayName the display name of the channel
     */
    constructor(qualifiedName, displayName) {
        this.qualifiedName = qualifiedName;
        this.displayName = displayName;
    }
}


/*
 * ====================================================================================================
 * CHANNEL AND PLATFORM - TWITCH IMPL
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
     * https://www.twitch.tv/friends
     */
    FRIENDS: "FRIENDS",

    /**
     * https://www.twitch.tv/inventory
     */
    INVENTORY: "INVENTORY",

    /**
     * https://www.twitch.tv/messages/inbox
     */
    MESSAGES: "MESSAGES",

    /**
     * https://www.twitch.tv/payments
     */
    PAYMENTS: "PAYMENTS",

    /**
     * https://www.twitch.tv/settings
     * https://www.twitch.tv/settings/profile
     * https://www.twitch.tv/settings/channel
     * https://www.twitch.tv/settings/security
     * ...
     */
    SETTINGS: "SETTINGS",

    /**
     * https://www.twitch.tv/subscriptions
     */
    SUBSCRIPTIONS: "SUBSCRIPTIONS",

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
        return "Twitch";
    }

    /**
     * @override
     */
    get supportedSfmEnabledValues() {
        return Object.values(SfmEnabled);
    }

    /**
     * @override
     */
    buildChannel(name, displayName = null) {
        if (TWITCH_USERNAME_REGEX.test(name)) {
            const channelNameLowerCase = name.toLowerCase();
            return new Channel(this, channelNameLowerCase, displayName);
        }
        throw new Error("The given channel name [" + name +
            "] is not a valid channel name (regex: " + TWITCH_USERNAME_REGEX + ")");
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
        if (!qualifiedChannelName) {
            return null;
        }
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

    /**
     * @override
     */
    parseChannelFromUrl(url) {
        const pageType = this.parsePageFromUrl(url);
        if (pageType && pageType.channel) {
            return pageType.channel;
        }
        return null;
    }

    /**
     * @override
     */
    parsePageFromUrl(url) {
        try {
            // For most content the host has to be twitch.tv
            if ("www.twitch.tv" === url.hostname || "twitch.tv" === url.hostname) {
                if ("/" === url.pathname) {
                    return new PlatformPage(TwitchPageType.ROOT);
                }
                // "/directory" is a special path
                if ("/directory" === url.pathname || "/directory/" === url.pathname) {
                    return new PlatformPage(TwitchPageType.DIRECTORY);
                }
                if (url.pathname.startsWith("/directory")) {
                    return new PlatformPage(TwitchPageType.DIRECTORY_UNKNOWN_SUB_DIR);
                }
                // "/friends" is a special path
                if (url.pathname.startsWith("/friends")) {
                    return new PlatformPage(TwitchPageType.FRIENDS);
                }
                // "/inventory" is a special path
                if (url.pathname.startsWith("/inventory")) {
                    return new PlatformPage(TwitchPageType.INVENTORY);
                }
                // "/messages" is a special path
                if (url.pathname.startsWith("/messages")) {
                    return new PlatformPage(TwitchPageType.MESSAGES);
                }
                // "/payments" is a special path
                if (url.pathname.startsWith("/payments")) {
                    return new PlatformPage(TwitchPageType.PAYMENTS);
                }
                // "/settings" is a special path
                if (url.pathname.startsWith("/settings")) {
                    return new PlatformPage(TwitchPageType.SETTINGS);
                }
                // "/subscriptions" is a special path
                if (url.pathname.startsWith("/subscriptions")) {
                    return new PlatformPage(TwitchPageType.SUBSCRIPTIONS);
                }
                let match = new RegExp("^/videos/(\\d+)(?:/)?$").exec(url.pathname);
                if (match !== null) {
                    return new PlatformPage(TwitchPageType.VIDEO, null, match[1]);
                }
                match = new RegExp("^/([^/]+)/videos/all(?:/)?$").exec(url.pathname);
                if (match !== null) {
                    return new PlatformPage(TwitchPageType.CHANNEL_VIDEOS, this.buildChannel(match[1]));
                }
                match = new RegExp("^/([^/]+)(?:/)?$").exec(url.pathname);
                if (match !== null) {
                    return new PlatformPage(TwitchPageType.CHANNEL, this.buildChannel(match[1]));
                }
                match = new RegExp("^/([^/]+)/.*$").exec(url.pathname);
                if (match !== null) {
                    return new PlatformPage(TwitchPageType.CHANNEL_UNKNOWN_SUB_DIR, this.buildChannel(match[1]));
                }
                return new PlatformPage(TwitchPageType.UNKNOWN);
            } else if (url.hostname.includes("twitch.tv")) {
                // sub-hosts like "clips.twitch.tv" or "app.twitch.tv"
                return new PlatformPage(TwitchPageType.UNKNOWN);
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


/*
 * ====================================================================================================
 * CHANNEL AND PLATFORM - MLG IMPL
 * ====================================================================================================
 */

const MlgPageType = Object.freeze({
    /**
     * "http://www.mlg.com"
     */
    ROOT: "ROOT",

    /**
     * Video main page
     *
     * "http://www.mlg.com/video/overwatch-world-cup-blizzcon-day-1/_id/miLqHWYeQWW/_pid/24"
     */
    VIDEO: "VIDEO",

    /**
     * Player iframe
     *
     * //player2.majorleaguegaming.com/api/v2/player/embed/vod/mlg-vod?vid=miLqHWYeQWW&autoplay=true&esrc=jsapi
     */
    IFRAME_PLAYER: "IFRAME_PLAYER",

    /**
     * all others
     */
    UNKNOWN: "UNKNOWN",
});

class MlgPlatform extends Platform {
    /**
     * @override
     */
    get name() {
        return "mlg.com";
    }

    /**
     * @override
     */
    get displayName() {
        return "MLG";
    }

    /**
     * @override
     */
    get supportedSfmEnabledValues() {
        return Object.freeze([SfmEnabled.NEVER, SfmEnabled.ALWAYS]);
    }

    /**
     * @override
     */
    parseChannelFromQualifiedName(qualifiedChannelName) {
        return null;
    }

    /**
     * @override
     */
    parseChannelFromUrl(url) {
        return null;
    }

    /**
     * @override
     */
    parsePageFromUrl(url) {
        if (url.hostname.includes("mlg.com")) {
            if ("/" === url.pathname) {
                return new PlatformPage(MlgPageType.ROOT);
            }
            if (url.pathname.startsWith("/video")) {
                return new PlatformPage(MlgPageType.VIDEO);
            }
            return new PlatformPage(MlgPageType.UNKNOWN);
        } else if (url.hostname.includes("majorleaguegaming.com")) {
            if (url.hostname.includes("player")) {
                return new PlatformPage(MlgPageType.IFRAME_PLAYER);
            }
            return new PlatformPage(MlgPageType.UNKNOWN);
        }
        return null;
    }
}

/*
 * ====================================================================================================
 * CHANNEL AND PLATFORM - ALL IMPLS
 * ====================================================================================================
 */

const TWITCH_PLATFORM = Object.freeze(new TwitchPlatform());
const MLG_PLATFORM = Object.freeze(new MlgPlatform());

/**
 *
 * @type {ReadonlyArray<Platform>}
 */
const ALL_PLATFORMS = Object.freeze([TWITCH_PLATFORM, MLG_PLATFORM]);


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

const OPT_SFM_ENABLED_GLOBAL_NAME = "sfmEnabledGlobal";
const OPT_SFM_ENABLED_GLOBAL_DEFAULT = SfmEnabled.CUSTOM;
const OPT_SFM_ENABLED_PLATFORMS_NAME = "sfmEnabledPlatforms";
const OPT_SFM_ENABLED_PLATFORMS_DEFAULT = getOptSfmEnabledPlatformsDefaultValue();
const OPT_SFM_ENABLED_CHANNELS_NAME = "sfmEnabledChannels";
const OPT_SFM_ENABLED_CHANNELS_DEFAULT = Object.freeze([]);
const OPT_SFM_PLAYER_HIDE_DURATION_NAME = "sfmPlayerHideDuration";
const OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT = true;
const OPT_SFM_PLAYER_JUMP_DISTANCE_NAME = "sfmPlayerJumpDistance";
const OPT_SFM_PLAYER_JUMP_DISTANCE_DEFAULT = "3m";
const OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME = "sfmVideoListHideTitle";
const OPT_SFM_VIDEO_LIST_HIDE_TITLE_DEFAULT = false;
const OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME = "sfmVideoListHidePreview";
const OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_DEFAULT = false;
const OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME = "sfmVideoListHideDuration";
const OPT_SFM_VIDEO_LIST_HIDE_DURATION_DEFAULT = true;
const OPT_GENERAL_THEATRE_MODE_NAME = "generalTheatreMode";
const OPT_GENERAL_THEATRE_MODE_DEFAULT = false;

/**
 *
 * @return {!Object.<string, object>} the default options
 */
function getDefaultOptionsCopy() {
    return {
        [OPT_SFM_ENABLED_GLOBAL_NAME]: OPT_SFM_ENABLED_GLOBAL_DEFAULT,
        [OPT_SFM_ENABLED_CHANNELS_NAME]: OPT_SFM_ENABLED_CHANNELS_DEFAULT,
        [OPT_SFM_ENABLED_PLATFORMS_NAME]: OPT_SFM_ENABLED_PLATFORMS_DEFAULT,
        [OPT_SFM_PLAYER_HIDE_DURATION_NAME]: OPT_SFM_PLAYER_HIDE_DURATION_DEFAULT,
        [OPT_SFM_PLAYER_JUMP_DISTANCE_NAME]: OPT_SFM_PLAYER_JUMP_DISTANCE_DEFAULT,
        [OPT_SFM_VIDEO_LIST_HIDE_TITLE_NAME]: OPT_SFM_VIDEO_LIST_HIDE_TITLE_DEFAULT,
        [OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_NAME]: OPT_SFM_VIDEO_LIST_HIDE_PREVIEW_DEFAULT,
        [OPT_SFM_VIDEO_LIST_HIDE_DURATION_NAME]: OPT_SFM_VIDEO_LIST_HIDE_DURATION_DEFAULT,
        [OPT_GENERAL_THEATRE_MODE_NAME]: OPT_GENERAL_THEATRE_MODE_DEFAULT
    };
}

/**
 * @param changes {!Object.<!string, !storage.StorageChange>}
 * @return {!Object.<string, object>} the changed options
 */
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
 * @returns {!boolean} whether the option is a option to configure the Spoiler-Free Mode (SFM)
 */
function isSfmOption(optionName) {
    return optionName.startsWith("sfm");
}

/**
 *
 * @param optionName {!string} the option's name
 * @returns {!boolean} whether the option is a option to enable/disable the Spoiler-Free Mode (SFM)
 */
function isSfmEnabledOption(optionName) {
    return optionName.startsWith("sfmEnabled");
}

/**
 *
 * @param options {!Object<!string, !Object>} the options
 * @return {!boolean} whether the options object contains an option to enable/disable the Spoiler-Free Mode (SFM)
 */
function containsSfmEnabledOption(options) {
    for (let optionName in options) {
        if (isSfmEnabledOption(optionName)) {
            return true;
        }
    }
    return false;
}

const SfmState = Object.freeze({
    UNSUPPORTED: "UNSUPPORTED",
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    CHANNEL_DEPENDENT: "CHANNEL_DEPENDENT"
});

/**
 * @param options the options
 * @param platform {?Platform} the platform to check
 * @param channel {?Channel} the channel to check
 * @return {!string} {@link SfmState}
 */
function checkSfmState(options, platform, channel) {
    if (platform === null) {
        return SfmState.UNSUPPORTED;
    }
    const sfmEnabledGlobal = options[OPT_SFM_ENABLED_GLOBAL_NAME];
    if (SfmEnabled.ALWAYS === sfmEnabledGlobal) {
        return SfmState.ACTIVE;
    } else if (SfmEnabled.NEVER === sfmEnabledGlobal) {
        return SfmState.INACTIVE;
    } else if (SfmEnabled.CUSTOM === sfmEnabledGlobal) {
        const sfmEnabledOnPlatform = getSfmEnabledOnPlatform(options, platform);
        if (SfmEnabled.ALWAYS === sfmEnabledOnPlatform) {
            return SfmState.ACTIVE;
        }
        else if (SfmEnabled.NEVER === sfmEnabledOnPlatform) {
            return SfmState.INACTIVE;
        }
        else if (SfmEnabled.CUSTOM === sfmEnabledOnPlatform) {
            if (channel === null) {
                return SfmState.CHANNEL_DEPENDENT;
            }
            else if (getSfmEnabledOnChannel(options, channel)) {
                return SfmState.ACTIVE;
            }
            else {
                return SfmState.INACTIVE;
            }
        }
    }
}

/**
 * @param options {!Object<!string, !Object>} the options
 * @return {!object<!string, !string>} a copy of the map: {@link Platform}'s name -> {@link SfmEnabled} value
 */
function getOptSfmEnabledPlatforms(options) {
    return JSON.parse(JSON.stringify(options[OPT_SFM_ENABLED_PLATFORMS_NAME]));
}

function getOptSfmEnabledPlatformsDefaultValue() {
    /*
     * We cannot just assign the same default value to all platforms because not all platforms support all SfmEnabled values.
     * So define the order of the default values and check for each if it is supported and if yes, assign it.
     */
    const defaultValueOrder = [SfmEnabled.CUSTOM, SfmEnabled.NEVER, SfmEnabled.ALWAYS];
    const sfmEnabledPlatforms = {};

    for (let i = 0; i < ALL_PLATFORMS.length; i++) {
        const platform = ALL_PLATFORMS[i];
        for (let j = 0; j < defaultValueOrder.length; j++) {
            const defaultValue = defaultValueOrder[j];
            if (platform.supportedSfmEnabledValues.includes(defaultValue)) {
                sfmEnabledPlatforms[platform.name] = defaultValue;
                break;
            }
        }
        if (sfmEnabledPlatforms[platform.name] === undefined) {
            throw Error("Failed to set default value for SfmEnabled of platform " + platform.name);
        }
    }
    return Object.freeze(sfmEnabledPlatforms);
}

/**
 * @param options {!Object<!string, !Object>} the options
 * @return {!ReadonlyArray<!ChannelSerialized>} the unmodifiable array of sfm channels
 */
function getOptSfmEnabledChannels(options) {
    return options[OPT_SFM_ENABLED_CHANNELS_NAME];
}

/**
 *
 * @param options {!Object<!string, !Object>} the options
 * @param platform {!Platform} the Platform
 * @return {!string} the {@link SfmEnabled} value
 */
function getSfmEnabledOnPlatform(options, platform) {
    const sfmEnabledPlatforms = getOptSfmEnabledPlatforms(options);
    for (const platformName in sfmEnabledPlatforms) {
        if (platform.name === platformName) {
            return sfmEnabledPlatforms[platformName];
        }
    }
    throw new Error("Could not find the SfmEnabled value for platform " + platform + " in option [" + OPT_SFM_ENABLED_PLATFORMS_NAME + "] value: " + sfmEnabledPlatforms);
}

/**
 *
 * @param options {!Object<!string, !Object>} the options
 * @param channel {!Channel} the channel
 * @return {!boolean} whether SFM is enabled on the given channel
 */
function getSfmEnabledOnChannel(options, channel) {
    return getOptSfmEnabledChannels(options).some(ch => Channel.equal(ch, channel));
}


/*
 * ====================================================================================================
 * MESSAGE PASSING
 * ====================================================================================================
 */

const MessageType = Object.freeze({
    TAB_INFO: "TAB_INFO",
    TAB_INFO_REQUEST: "TAB_INFO_REQUEST"
});

/**
 * @property {!string} type the message type {@link MessageType}
 * @property {?object} [body] the message body
 */
class Message {
    constructor(type, body = null) {
        this.type = type;
        this.body = body;
    }
}

/**
 * @property {!PlatformSerialized} platform the serialized platform of the current tab
 * @property {?ChannelSerialized} [channel] the serialized channel of the current tab
 * @property {!string} [sfmState] {@link SfmState}
 */
class TabInfo {
    constructor(platform, channel = null, sfmState = SfmState.UNSUPPORTED) {
        this.platform = platform;
        this.channel = channel;
        this.sfmState = sfmState;
    }
}

class TabInfoMessage extends Message {
    constructor(tabInfo) {
        super(MessageType.TAB_INFO, tabInfo);
    }
}

class TabInfoRequestMessage extends Message {
    constructor() {
        super(MessageType.TAB_INFO_REQUEST);
    }
}


/*
 * ====================================================================================================
 * ELEMENT IDS & CSS CLASSES
 * ====================================================================================================
 */

/**
 * The CSS class of Open End container elements. To not interfere with the page CSS style,
 * we wrap every element we want to hide in a custom container element and then hide that container.
 * @type {string}
 */
const OPND_CONTAINER_CLASS = "opnd-container";
const OPND_INNER_CONTAINER_CLASS = "opnd-inner-container";
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
 * The CSS class of Open End containers
 * that wrap elements of the player which contain a video's duration or the seek bar.
 * @type {string}
 */
const OPND_CONTAINER_PLAYER_DURATION_CLASS = "opnd-container-player-duration";

/**
 * The CSS class of an Open End container of a hidden video list item.
 * @type {string}
 */
const OPND_CONTAINER_HIDDEN_VIDEO_LIST_ITEM = "opnd-container-hidden-video-list-item";
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

function compareStringIgnoreCase(s1, s2) {
    const s1CaseInsensitive = s1.toUpperCase();
    const s2CaseInsensitive = s2.toUpperCase();
    if (s1CaseInsensitive < s2CaseInsensitive) {
        return -1;
    }
    if (s1CaseInsensitive > s2CaseInsensitive) {
        return 1;
    }
    return 0;
}


/*
 * ====================================================================================================
 * ENUM UTILS
 * ====================================================================================================
 */
/**
 * @param enumObj {!object} the enum object
 * @param msgKeyPrefix {!string}
 * @return {Map<!string, !string>} enum value -> message key
 */
function buildEnumValueToMsgKeyMap(enumObj, msgKeyPrefix) {
    const map = new Map();
    for (const key in enumObj) {
        const enumValue = enumObj[key];
        map.set(enumValue, getEnumValueMsgKey(enumValue, msgKeyPrefix));
    }
    return map;
}

function getEnumValueMsgKey(enumValue, msgKeyPrefix) {
    return msgKeyPrefix + enumValue;
}


/*
 * ====================================================================================================
 * DURATION UTILS
 * ====================================================================================================
 */

const DURATION_PATTERN = "^(?:(\\d+)|(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s)?)$";
const DURATION_ONLY_NUM_PATTERN = "^\\d+$";

/**
 * Suffixes the given duration string with a "m" as single numbers are interpreted as minutes.
 *
 * @param durationString {!string}
 * @return {!string}
 */
function normalizeDurationString(durationString) {
    if (new RegExp(DURATION_ONLY_NUM_PATTERN).test(durationString)) {
        return durationString + "m";
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
 * @param padWithZeros {?boolean} whether the parts should be padded with leading zeros ("01" instead of "1")
 * @return {!string}
 */
function formatDuration(duration, padWithZeros = true) {
    const parts = extractDurationParts(duration);
    let formatted = "";
    if (parts[0] > 0) {
        formatted += (padWithZeros ? padLeft(parts[0]) : parts[0]) + "h";
    }
    if (parts[1] > 0) {
        formatted += (padWithZeros ? padLeft(parts[1]) : parts[1]) + "m";
    }
    if (parts[2] > 0) {
        formatted += (padWithZeros ? padLeft(parts[2]) : parts[2]) + "s";
    }
    return formatted;
}

/**
 * 3723 = 1h, 2m, 3s -> [1, 2, 3]
 *
 * negative numbers are interpreted as positive numbers
 *
 * @param duration {!number}
 * @return {[!number,!number,!number]}
 */
function extractDurationParts(duration) {
    let amount = Math.abs(duration);
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
 * WINDOW UTILS
 * ====================================================================================================
 */

function isTopFrame() {
    return window === window.top;
}

function formatFrameType() {
    return isTopFrame() ? "TOP_FRAME" : "SUB_FRAME";
}


/*
 * ====================================================================================================
 * ELEMENT UTILS
 * ====================================================================================================
 */

/**
 *
 * @param elem {!HTMLElement}
 * @param attrName {!string}
 * @return {?string}
 */
function getAttr(elem, attrName) {
    const attrValue = elem[attrName];
    return attrValue.length > 0 ? attrValue : null;
}

/**
 *
 * @param elem {!HTMLElement}
 * @param attrName {!string}
 * @param attrValue {?string}
 */
function setAttr(elem, attrName, attrValue) {
    elem[attrName] = attrValue ? attrValue : "";
}


/**
 *
 * @param elem {!HTMLElement}
 * @param dataName {!string}
 * @return {?string}
 */
function getData(elem, dataName) {
    const dataValue = elem.dataset[dataName];
    if (dataValue) {
        return dataValue.length > 0 ? dataValue : null;
    }
    return null;
}

/**
 *
 * @param elem {!HTMLElement}
 * @param dataName {!string}
 * @param dataValue {?string}
 */
function setData(elem, dataName, dataValue) {
    elem.dataset[dataName] = dataValue ? dataValue : "";
}

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
    return allElements;
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
        removeElement(elements[i]);
    }
}

function removeElement(element) {
    element.parentNode.removeChild(element);
}

/**
 *
 * @param elements {?Iterable.<Element>} the elements which visibility should be changed or null to change all
 * @param visible {?boolean} true, false or null (to toggle)
 * @return {?boolean} true if the elements were set visible, false if not. null if there were no elements
 */
function setAllVisible(elements, visible) {
    let actualElements = elements;
    if (actualElements === null) {
        actualElements = document.getElementsByClassName(OPND_HIDDEN_CLASS);
    }
    let actuallySetVisible = visible;
    for (let i = 0; i < actualElements.length; i++) {
        const elem = actualElements[i];
        if (actuallySetVisible === null) {
            // If the visible param is null,
            // we check the first element's visible state and use that to toggle all elements.
            actuallySetVisible = elem.classList.contains(OPND_HIDDEN_CLASS);
        }
        if (actuallySetVisible) {
            elem.classList.remove(OPND_HIDDEN_CLASS);
        } else {
            elem.classList.add(OPND_HIDDEN_CLASS);
        }
    }
    return actuallySetVisible;
}

/**
 * @param element {!Element}
 * @param visible {?boolean} true, false or null (to toggle)
 * @return {!boolean} true if the element was set visible, false if not
 */
function setVisible(element, visible) {
    if (visible === true) {
        element.classList.remove(OPND_HIDDEN_CLASS);
        return true;
    } else if (visible === false) {
        element.classList.add(OPND_HIDDEN_CLASS);
        return false;
    } else {
        if (element.classList.contains(OPND_HIDDEN_CLASS)) {
            element.classList.remove(OPND_HIDDEN_CLASS);
            return true;
        } else {
            element.classList.add(OPND_HIDDEN_CLASS);
            return false;
        }
    }
}

/**
 * @callback ElementsSupplier
 * @return {!Iterable<Element>}
 */
/**
 * @param elementsSupplier {!ElementsSupplier}
 * @param additionalClass {?string} the addition CSS class for the opnd-container
 * @return {!Array.<Element>} the elements wrapped in opnd-containers
 */
function getOrWrapSuppliedInOpndContainers(elementsSupplier, additionalClass = null) {
    return getOrWrapAllInOpndContainers(elementsSupplier(), additionalClass);
}

/**
 *
 * @param elements {!Iterable<Element>} the elements
 * @param additionalClass {?string} the addition CSS class for the opnd-container
 * @return {!Array.<Element>} the elements wrapped in opnd-containers
 */
function getOrWrapAllInOpndContainers(elements, additionalClass = null) {
    const opndContainers = [];
    for (let i = 0; i < elements.length; i++) {
        opndContainers.push(getOrWrapInOpndContainer(elements[i], additionalClass));
    }
    return opndContainers;
}

/**
 *
 * @param element {!Element} the element
 * @param additionalClass {?string} the addition CSS class for the opnd-container
 * @return {!Element} the element wrapped in a opnd-container
 */
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
    return wrap(element, createOpndContainer(additionalClass));
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
    return document.querySelector("input[name = '" + radioName + "']:checked").value;
}

/**
 *
 * @param radioName {string} the name of all radio inputs in the group
 * @param selectedValue {string} the value of the selected radio
 */
function setRadioValues(radioName, selectedValue) {
    const allRadios = document.querySelectorAll("input[type='radio'][name = '" + radioName + "']");
    for (let i = 0; i < allRadios.length; i++) {
        const radio = allRadios[i];
        radio.checked = radio.value === selectedValue;
    }
}

function listenForRadioChanges(radioName, changeHandler) {
    const allRadios = document.querySelectorAll("input[type='radio'][name = '" + radioName + "']");
    for (let i = 0; i < allRadios.length; i++) {
        allRadios[i].onclick = changeHandler;
    }
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
 * @param {!HTMLSelectElement} selectElem
 */
function clearSelectOptions(selectElem) {
    selectElem.length = 0;
}

/**
 *
 * @param {!HTMLSelectElement} selectElem
 * @param {!Map<!string, !string>} valueToMsgKeyMap option value -> message key
 * @param {?Iterable<!string>} [values=valueToMsgKeyMap.values()] the actual values, don't define to use all the keys of the valueToMsgKeyMap
 */
function setSelectOptions(selectElem, valueToMsgKeyMap, values = valueToMsgKeyMap.keys()) {
    // Clear old options
    clearSelectOptions(selectElem);

    // Add new options
    for (let value of values) {
        const optionElem = document.createElement("option");
        optionElem.value = value;
        optionElem.textContent = chrome.i18n.getMessage(valueToMsgKeyMap.get(value));
        selectElem.appendChild(optionElem);
    }
}

/**
 *
 * @param optionElem {!HTMLOptionElement}
 * @return {!Channel}
 */
function optionElemToChannel(optionElem) {
    return Channel.parseFromQualifiedName(optionElem.value, getData(optionElem, DATA_CHANNEL_DISPLAY_NAME));
}

function getSelectChannelsSerialized(selectId) {
    const selectElem = document.getElementById(selectId);
    const channelsSerialized = [];
    for (let i = 0; i < selectElem.length; i++) {
        const option = selectElem[i];
        const channel = optionElemToChannel(option);
        channelsSerialized.push(channel.serialize());
    }
    return channelsSerialized;
}

/**
 *
 * @param channel {!Channel}
 * @return {!HTMLOptionElement}
 */
function channelToOptionElem(channel) {
    const optionElem = document.createElement("option");
    optionElem.value = channel.qualifiedName;
    setData(optionElem, DATA_CHANNEL_DISPLAY_NAME, channel.displayName);
    optionElem.innerText = channel.verboseQualifiedName;
    return optionElem;
}

/**
 *
 * @param selectElem {!HTMLSelectElement} the select element
 * @param channels {!Array.<!Channel>} an array with all values
 */
function setChannelsToSortedSetSelect(selectElem, channels) {
    clearSelectOptions(selectElem);
    channels.sort(Channel.compareByVerboseQualifiedName);
    for (let i = 0; i < channels.length; i++) {
        const optionElem = channelToOptionElem(channels[i]);
        selectElem.appendChild(optionElem);
    }
}

/**
 *
 * @param selectElem {!HTMLSelectElement}
 * @param channel {!Channel}
 */
function insertChannelInSortedSetSelect(selectElem, channel) {
    const optionElem = channelToOptionElem(channel);
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
        if (compareStringIgnoreCase(optionElem.textContent, currentOptionElem.textContent) < 0) {
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
function setMsgToTextContent(labelId, messageName) {
    document.getElementById(labelId).textContent = chrome.i18n.getMessage(messageName);
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
 *
 * @param elementId the id of the element
 * @param messageName the message name of the localized placeholder
 */
function setMsgToPlaceholder(elementId, messageName) {
    document.getElementById(elementId).placeholder = chrome.i18n.getMessage(messageName);
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
 * EXTENSION API
 * ====================================================================================================
 */

const opnd = {
        browser: {
            /**
             *
             * @param keys {string|Array<string>|Object|null} an option key, an array of option keys or an object of option keys and their default values or null to read all options
             * @return {!Promise<{string: object}>} only returns existing items (not "nonExistingKey": undefined)
             */
            readOptions: (keys) => {
                let actualKeys;
                if (keys) {
                    actualKeys = keys;
                } else {
                    actualKeys = getDefaultOptionsCopy();
                }
                return new Promise((resolve, reject) => {
                    chrome.storage.sync.get(actualKeys, function (items) {
                        if (chrome.runtime.lastError) {
                            error("[browser.readOptions] Failed to get options [%o]: %o", actualKeys, chrome.runtime.lastError);
                            reject(Error(chrome.runtime.lastError.message));
                            return;
                        }
                        log("[browser.readOptions] Gotten options [%o]", items);
                        resolve(items);
                    });
                });
            },

            /**
             *
             * @param items {?object} {@link chrome.storage.StorageArea.set}
             * @return {Promise<void>}
             */
            writeOptions: (items) => {
                return new Promise((resolve, reject) => {
                    chrome.storage.sync.set(items, function () {
                        if (chrome.runtime.lastError) {
                            error("[browser.writeOptions] Failed to set options [%o]: %o", items, chrome.runtime.lastError);
                            reject(Error(chrome.runtime.lastError.message));
                            return;
                        }
                        log("[browser.writeOptions] Set options [%o]", items);
                        resolve();
                    });
                });
            },

            /**
             *
             * @param keys {string|Array<string>} {@link chrome.storage.StorageArea.remove}
             * @return {Promise<void>}
             */
            removeOptions: (keys) => {
                return new Promise((resolve, reject) => {
                    chrome.storage.sync.remove(keys, function () {
                        if (chrome.runtime.lastError) {
                            error("[browser.removeOptions] Failed to remove options [%o]: %o", keys, chrome.runtime.lastError);
                            reject(Error(chrome.runtime.lastError.message));
                            return;
                        }
                        log("[browser.removeOptions] Removed options [%o]", keys);
                        resolve();
                    });
                });
            },

            /**
             *
             * @param message {Message} the message
             * @return {Promise<Object>} a Promise that will hold the response (rejection can be ignored because it mostly is normal: Both the receiving popup being not available or it not sending response leads to a rejection)
             */
            sendMessage: (message) => {
                return new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            log("[browser.sendMessage] Failed to send message [%o] (maybe no popup open or it did not send a response (which it does not)?): %o", message, chrome.runtime.lastError);
                            reject(Error(chrome.runtime.lastError.message));
                            return;
                        }

                        log("[browser.sendMessage] Gotten response [%o] for message [%o]", response, message);
                        resolve(response);
                    });
                });
            },

            /**
             * To use from the popup.
             *
             * @return {Promise<Tab>}
             */
            getCurrentTab: () => {
                // Query filter to be passed to chrome.tabs.query - see https://developer.chrome.com/extensions/tabs#method-query
                const queryInfo = {
                    active: true,
                    currentWindow: true
                };
                return new Promise((resolve, reject) => {
                    chrome.tabs.query(queryInfo, (tabs) => {
                        if (chrome.runtime.lastError) {
                            error("[browser.getCurrentTab] Failed to get current Tab: %o", chrome.runtime.lastError);
                            reject(Error(chrome.runtime.lastError.message));
                            return;
                        }
                        /* chrome.tabs.query invokes the callback with a list of tabs that match the query.
                         * When the popup is opened, there is certainly a window and at least one tab,
                         * so we can safely assume that |tabs| is a non-empty array.
                         * A window can only have one active tab at a time, so the array consists of exactly one tab.
                         */
                        const currentTab = tabs[0];
                        log("[browser.getCurrentTab] Gotten current Tab [%o]", currentTab);
                        resolve(currentTab);
                    });
                });
            },

            /**
             * @param tab {!Tab}
             * @return {!Promise<{TabInfo}>} the TabInfo (rejection can be ignored as it is normal on a non-platform pages)
             */
            requestTabInfo: (tab) => {
                if (!tab.id) {
                    return Promise.reject(Error("Given Tab has no ID: " + tab));
                }
                return new Promise((resolve, reject) => {
                        chrome.tabs.sendMessage(tab.id, new TabInfoRequestMessage(), (response) => {
                            if (chrome.runtime.lastError) {
                                // It's a normal case on pages where no content_script was injected (non-platform pages)
                                log("[browser.requestTabInfo] Failed to get TabInfo for Tab [%o] (maybe not on platform page?): %o", tab, chrome.runtime.lastError);
                                reject(Error(chrome.runtime.lastError.message));
                                return;
                            }
                            if (response.type !== MessageType.TAB_INFO) {
                                error("[browser.requestTabInfo] Failed to get TabInfo for Tab [%o]: Response type was not [%s] but [%s]. Full response [%o])", tab, MessageType.TAB_INFO, response.type, response);
                                reject(Error("[browser.requestTabInfo] Failed to get TabInfo: Response type was not " + MessageType.TAB_INFO + " but " + response.type));
                                return;
                            }
                            const tabInfo = response.body;
                            log("[browser.requestTabInfo] Gotten TabInfo [%o] for Tab [%o]", tabInfo, tab);
                            resolve(tabInfo);
                        });
                    }
                );
            },

            /**
             * @return {!Promise<{TabInfo}>} the TabInfo (rejection can be ignored as it is normal on a non-platform pages)
             */
            requestTabInfoFromCurrentTab: () => {
                return opnd.browser.getCurrentTab().then(opnd.browser.requestTabInfo);
            },

            openOptionsPage: () => {
                return new Promise((resolve, reject) => {
                    chrome.runtime.openOptionsPage(() => {
                        if (chrome.runtime.lastError) {
                            error("[browser.openOptionsPage] Failed to open the options page: %o", chrome.runtime.lastError);
                            reject(Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve();
                    });
                });
            }
        }
    }
;