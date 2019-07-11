 # Some future version

- Software:
  - Maybe add additional time jump buttons for 5s/30s backwards/forward (they need extra space and disturb the design/layout so don't overuse)
  - Maybe rename "time jump" to "seek" as we don't jump anymore with rapid seeking
    - Seek 5s forward, seek 5s backward (or fast-forward 5s / rewind 5s; 5s vorspulen, 5s zurückspulen
    - "jump" is used over 100 times in the code.
  - Refactor twitch.tv and mlg.com to both use the same common content_script.js routine and just configure it accordingly.
    - Remove huge amounts of code duplication -> improved code quality and maintainability.
- Chrome Web Store:
  - Diversify screenshots. Include csgo, lol screens
  - Include ow, owl, csgo, lol into description?
  - Add another screen of the video list. One with only duration hidden, one with different constellations
  - Mention SFM in the short description (chrome web store and github)
 

# General TODO before release
- Search for console.log
- Set LOG_ENABLED = false in common.js
- Update version to non-SNAPSHOT
- Search for TODO
