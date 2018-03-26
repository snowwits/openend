# TODO version 0.3.0
- Fix: Video List Items: Tooltip for buttons ("Hide title", "Hide preview image")is rendered behind the game logo.
  - Maybe change "Hide preview image" to "Hide preview"
  - Maybe change tooltips to First Letter Uppercase (conform with Twitch tooltips)
    - Check all the headlines
- Fix: Add max-height to options because it does not scale/show a scrollbar on shorter screens.
- "Not a supported video platform" is unclear. Either a longer text like "The current page is not a supported video platform" or remove completely.
- Popup: Less margin above "Enable Spoiler-Free Mode"
- Popup: Maybe smaller font size for qualified names
- Validate migration routine
- Doc: Screenshots
  - And put the screenshots used in the Chrome description into git
- Change author of MH commits
- bug hunt
- disable log

# TODO version 0.4.0

- Introduce tabs to the options page -> make options more clear/organized
- Make video list items hideable by platform, channel and title. Plus, add a "Show/Hide hidden videos" button
- Add profiles
  - Predefined: default, Overwatch (twitch.tv/overwatchleague, twitch.tv/overwatchcontenders, 3m, hide non-full-day VODs on twitch.tv/overwatchleague)
  - Profile selectable on popup and options -> options are changed accordingly
  - Current cfg storable as profile on options

  
# TODO version 0.5.0

- Refactor twitch.tv and mlg.com to both use the same common content_script.js routine and just configure it accordingly.
  - Remove huge amounts of code duplication -> improved code quality and maintainability.