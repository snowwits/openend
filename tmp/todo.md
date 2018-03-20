# TODO version 0.3.0

- For MLG.com only SfmEnabled.ALWAYS/NEVER should be available, because no channels are supported on this platform
  - Add property Platform.allowedSfmEnabledModes (array of SfmEnabled values)
- When channel is determined and it is part of sfmEnabledChannels, compare determinedChannel.displayName (if non null) with sfmEnabledChannel.displayName and in case of non equality, update the sfmEnabledChannel.displayName

# TODO version 0.4.0

- Introduce tabs to the options page -> make options more clear/organized
- Make video list items hideable by platform, channel and title. Plus, add a "Show/Hide hidden videos" button
- Add profiles
  - Predefined: default, Overwatch (twitch.tv/overwatchleague, twitch.tv/overwatchconders, 3m, hide non-full-day VODs on twitch.tv/overwatchleague)
  - Profile selectable on popup and options -> options are changed accordingly
  - Current cfg storable as profile on options

  
# TODO version 0.5.0

- Refactor twitch.tv and mlg.com to both use the same common content_script.js routine and just configure it accordingly.
  - Remove huge amounts of code duplication -> improved code quality and maintainability.