# TODO version 0.3.0
- Fix: Add max-height to options because it does not scale/show a scrollbar on shorter screens.
  - Set a height of 400px -> try it out
- Validate migration routine
- Try out only using rapid seeking method for time jumps
  - Maybe rename the buttons (seek x forward, seek x backward)
  - Doc: How to time jump while keep full screen
    - [x] Auto enter Theatre Mode and enable Chrome full screen mode (F11)
    - -> Solved if we only use rapid seeking
- bug hunt

# TODO version 0.3.x

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