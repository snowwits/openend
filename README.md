# Open End
Chrome extension that lets you hide the title, preview and duration of videos on Twitch.tv to prevent spoilers when watching e-sports or sports videos.

## Description 
Sometimes you can't or don't want to watch a e-sports or sports event live. But when you are watching the videos later, the titles, preview thumbnails or durations of videos can often give away the ending. For example, if you are watching a best-of-3 series and the video has almost reached its end during second match, you know that it will be a 2:0 victory.
Or if you are scrolling through a video list to find the semifinals videos and accidentally read the finalists names in the grand final video title, the excitement for the semifinals quickly fades away.

Open End prevents those kinds of spoilers by hiding certain information on Twitch.tv. Its features include:

## Features
### Main Feature: Spoiler-Free Mode
- Hides the progress and duration of the video you are currently watching
- Hides the title, preview and duration of other videos (suggested/related videos, videos in video lists)
- Provides quick video navigation features to mitigate the lack of a seek bar

### Minor Features
- Custom channel list to auto-enable the Spoiler-Free Mode only on selected channels (for example enable it on tournament channels but not on streamer channels)
  - Quickly add/remove channels to/from the list without having to go through the options (only two clicks needed)
- What information should be hidden is customizable
- The visibility of any hideable element can be toggled directly on the page (no need to refresh the page)
- Option changes are directly applied (no need to refresh the page)
- Auto-enter the Theatre Mode
- Can be used alongside BetterTTV without problems

## Usage
### General
- **Toolbar icon:** The extension has an icon in the Chrome toolbar (next to the address bar). Click on it to quickly access the most important features
- **Options:** On the popup you can click on the "Options..." button to open the options of the extension. Explore the options and customize the extension as you like it

### Enable/Disable Spoiler-free Mode
- Click on the Open End icon in the Chrome toolbar
- Choose one of the options under "Enable Spoiler-Free Mode" ("Never", "Always" or "Only on selected channels")

### Enable Spoiler-free Mode only for a specific channel
**Option A: Via the toolbar icon**
- Click on the Open End icon in the Chrome toolbar. A popup opens
- On the popup select "(*) Only on selected channels"
- Check "[x] Enable Spoiler-Free Mode"

**Option B: Via the options**
- Click on the Open End icon in the Chrome toolbar. A popup opens
- On the popup click on "Options..."
- Make sure, you have selected "(*) Only on selected channels"
- In the Options, put the complete URL of a channel ("https://www.twitch.tv/playoverwatch") or the qualified name of a channel ("twitch.tv/playoverwatch") in the text field next to the button "Add channel"
- Click "Add channel" to add the channel. It will be added to the list of selected channels
- Save your changes by clicking the "Save" button
- Close the options

### Navigation in the video without a seek bar
- You can use the arrow keys (<-, ->) on your keyboard for 10 second time jumps
- If a video is run in Spoiler-Free Mode, Open End adds a quick navigation toolbar which you can use to make larger time jumps
- The length of the time jumps can be specified in the same format as twitch time stamps
  - E.g. \"2\" for 2 minutes or \"1h2m3s\" for 1 hour, 2 minutes and 3 seconds".
- When you hit Enter while being in the time jump text field, a forward jump is triggered 

### I want to customize what information about videos in video lists is hidden
- Click on the Open End icon in the Chrome toolbar. A popup opens
- On the popup click on "Options..."
- Go to the section "Items in video lists"
- Check/uncheck the options under that section according to your preferences  

## Roadmap and Version Notes
[See here](VERSION_NOTES.md)

## Contact
If you have questions or feature requests you can contact me:
- Mail: [snowwits@gmail.com](mailto:snowwits@gmail.com)
- Reddit: [/u/snowwits](https://www.reddit.com/user/snowwits)

## License
[Apache License 2.0](LICENSE.md)

## Credits
- Google: Material Design icons
  - https://www.flaticon.com/packs/material-design
- Krish Masand: Author of the Anticipation Chrome extension which has been an inspiration
  - https://github.com/krishmasand/Anticipation-Chrome
