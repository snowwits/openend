# TODO version 0.3.0
- Try out only using rapid seeking method for time jumps
  - Doc: How to time jump while keep full screen
    - [x] Auto enter Theatre Mode and enable Chrome full screen mode (F11)
    - -> Solved if we only use rapid seeking

# TODO version 0.3.x
- Find a good height for options
  - 500px is ok but seems like any height leeds to a scrollbar being visible when laptop is connected to TV.
- Maybe rename "time jump" to "seek" as we don't jump anymore with rapid seeking
  - Seek x forward, seek x backward; x vorspulen, x zurückspulen
  - "jump" is used over 100 times in the code.
- Fix: Video List Items Toolbar: Change icons based on whether it's currently visible or not
  - Currently only distinguished by the color of the icon (hidden: purple, shown: grey)
    - Color is not enough, shape needs to change
  - Instead use regular icons with diagonal cross through (like on hide svg)
- Refactor twitch.tv and mlg.com to both use the same common content_script.js routine and just configure it accordingly.
  - Remove huge amounts of code duplication -> improved code quality and maintainability.

# TODO version 0.4.0

- Introduce tabs to the options page -> make options more clear/organized
- Make video list items hideable by platform, channel and title. Plus, add a "Show/Hide hidden videos" button
- Add profiles
  - Predefined: default, Overwatch (twitch.tv/overwatchleague, twitch.tv/overwatchcontenders, 3m, hide non-full-day VODs on twitch.tv/overwatchleague)
  - Profile selectable on popup and options -> options are changed accordingly
  - Current cfg storable as profile on options
  
# General TODO before release
- Search for console.log
- Set LOG_ENABLED = false in common.js
- Update version to non SNAPSHOT