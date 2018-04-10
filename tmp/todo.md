# TODO version 0.3.x
- Software:
  - Maybe rename "time jump" to "seek" as we don't jump anymore with rapid seeking
    - Seek x forward, seek x backward; x vorspulen, x zurückspulen
    - "jump" is used over 100 times in the code.
  - Fix: Video List Items Toolbar: Change icons based on whether it's currently visible or not
    - Currently only distinguished by the color of the icon (hidden: purple, shown: grey)
      - Color is not enough, shape needs to change
    - Instead use regular icons with diagonal cross through (like on hide svg)
  - Migration: Add a Version JS class that is comparable (to be able to say `if (version < new Version("0.3.0") migrate)`
    - https://developer.chrome.com/extensions/manifest/version
  - Refactor twitch.tv and mlg.com to both use the same common content_script.js routine and just configure it accordingly.
    - Remove huge amounts of code duplication -> improved code quality and maintainability.
- Docs:
  - Structure like [PreferencesFX](https://github.com/dlemmermann/PreferencesFX):
    1. Short description
    1. Example screen
    1. Features
    1. Example screen with numbered and labeled components
    1. Explaining the components
  - Add next features survey to roadmap.md
- Chrome Web Store:
  - Diversify screenshots. Include csgo, lol screens
  - Include ow, owl, csgo, lol into description?
  - Add another screen of the videolist. One with only duration hidden, one with different constellations
  - Mention SFM in the short description (chrome web store and github)
- Git(hub):
  - Add release tags
# TODO version 0.4.0

- Make video list items hideable by platform, channel and title. Plus, add a "Show/Hide hidden videos" button
- Introduce tabs to the options page -> make options more clear/organized
- Add profiles
  - Predefined: default, Overwatch (twitch.tv/overwatchleague, twitch.tv/overwatchcontenders, 3m, hide non-full-day VODs on twitch.tv/overwatchleague)
  - Profile selectable on popup and options -> options are changed accordingly
  - Current cfg storable as profile on options
  
# General TODO before release
- Search for console.log
- Set LOG_ENABLED = false in common.js
- Update version to non SNAPSHOT