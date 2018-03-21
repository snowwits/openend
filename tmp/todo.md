# TODO version 0.3.0
- Fix bug that prevents the channel from being parsed correctly when on-page changing between offline channel (thus to a video page).
  - Always the last channel is parsed (page:OWL=>parsed:OWL -> fissure=>OWL -> OWC=>fissure -> Puggims=>OWC -> ...).
  - The problem is that the channel div is replaced async and most of the times the new channel name is loaded after the parsing is done. So the parsing parses the old channel name.
  - TODO: Add NodeObserver to "a[data-target=channel-header__channel-link]" and listen for href changes
    - Only attribute href and nested h5 text changes
- bug hunt

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