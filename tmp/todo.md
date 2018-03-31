# TODO version 0.3.0
- Fix: Video List Items: Tooltip for buttons ("Hide title", "Hide preview image") is rendered behind the game logo.
  - Maybe change tooltips to First Letter Uppercase (conform with Twitch tooltips)
    - Check all the headlines
- Fix: Add max-height to options because it does not scale/show a scrollbar on shorter screens.
  - Set a height of 400px -> try it out
- Validate migration routine
- Try out only using rapid seeking method for time jumps
  - Maybe rename the buttons (seek x forward, seek x backward)
  - Doc: How to time jump while keep full screen
    - [x] Auto enter Theatre Mode and enable Chrome full screen mode (F11)
    -> Solved if we only use rapid seeking
- Doc: Screenshots
  - And put the screenshots used in the Chrome description into git
- bug hunt
- disable log, search for "console.log"
- survey: next feature?
  - Firefox
  - YouTube
  - The 0.4.0 features
- Use ・ as enumeration char on chrome store description

# TODO version 0.3.x

- Refactor twitch.tv and mlg.com to both use the same common content_script.js routine and just configure it accordingly.
  - Remove huge amounts of code duplication -> improved code quality and maintainability.

# TODO version 0.4.0

- Introduce tabs to the options page -> make options more clear/organized
- Make video list items hideable by platform, channel and title. Plus, add a "Show/Hide hidden videos" button
- Add profiles
  - Predefined: default, Overwatch (twitch.tv/overwatchleague, twitch.tv/overwatchcontenders, 3m, hide non-full-day VODs on twitch.tv/overwatchleague)
  - Profile selectable on popup and options -> options are changed accordingly
  - Current cfg storable as profile on options