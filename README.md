# Open End
Chrome extension that lets you hide the title, preview and duration of videos on Twitch.tv to prevent spoilers when watching e-sports or sports videos.

# Table of Contents  
1. [Description](#1-description)  
2. [Features](#2-features)
3. [Usage](#3-usage)
4. [Roadmap and Version Notes](#4-roadmap-and-version-notes)
5. [Contact](#5-contact)
6. [License](#6-license)
6. [Credits](#7-credits)

## 1. Description 
Sometimes you can't or don't want to watch a e-sports or sports event live. But when you are watching the videos later, the titles, preview thumbnails or durations of videos can often give away the ending. For example, if you are watching a best-of-3 series and the video has almost reached its end during second match, you know that it will be a 2:0 victory.
Or if you are scrolling through a video list to find the semifinals videos and accidentally read the finalists names in the grand final video title, the excitement for the semifinals quickly fades away.

Open End prevents those kinds of spoilers by hiding certain information on Twitch.tv. Its features include:

## 2. Features
### 2.1 Main Feature: Spoiler-Free Mode
- Hides the progress and duration of the video you are currently watching
- Hides the title, preview and duration of other videos (suggested/related videos, videos in video lists)
- Provides quick video navigation features to mitigate the lack of a seek bar

### 2.2 Minor Features
- Custom channel list to auto-enable the Spoiler-Free Mode only on selected channels (for example enable it on tournament channels but not on streamer channels)
  - Quickly add/remove channels to/from the list without having to go through the options (only two clicks needed)
- What information should be hidden is customizable
- The visibility of any hideable element can be toggled directly on the page (no need to refresh the page)
- Option changes are directly applied (no need to refresh the page)
- Auto-enter the Theatre Mode
- Can be used alongside BetterTTV without problems

## 3. Usage
### 3.1 General
- **Toolbar icon:** The extension has an icon in the Chrome toolbar (next to the address bar). Click on it to quickly access the most important features
- **Options:** On the popup you can click on the "Options..." button to open the options of the extension. Explore the options and customize the extension as you like it
- **Player toolbar:** If the Spoiler-Free Mode is enabled for a channel, an Open End toolbar will be added to the player tha provides a button to show/hide the duration and quick video navigation features
  - The toolbar can be configured in the options
  - To learn how to navigate in a video, see [3.4](#34-navigate-in-the-video-without-a-seek-bar)
- **Video lists:** Open End can hide certain information about videos in videos lists.
  - What information is hidden can be configured in the options , see [3.5](#35-customize-what-information-about-videos-in-video-lists-is-hidden)

### 3.2 Enable/Disable Spoiler-Free Mode
1. Click on the Open End icon in the Chrome toolbar
2. Choose one of the options under "Enable Spoiler-Free Mode" ("Never", "Always" or "Only on selected channels")

### 3.3 Enable Spoiler-Free Mode only for a specific channel
**Option A: Via the toolbar icon**
1. Click on the Open End icon in the Chrome toolbar. A popup opens
2. On the popup select "(*) Only on selected channels"
3. Check "[x] Enable Spoiler-Free Mode"

**Option B: Via the options**
1. Click on the Open End icon in the Chrome toolbar. A popup opens
2. On the popup click on "Options..."
3. Make sure, you have selected "(*) Only on selected channels"
4. In the Options, put the complete URL of a channel ("https://www.twitch.tv/playoverwatch") or the qualified name of a channel ("twitch.tv/playoverwatch") in the text field next to the button "Add channel"
5. Click "Add channel" to add the channel. It will be added to the list of selected channels
6. Save your changes by clicking the "Save" button
7. Close the options

### 3.4 Navigate in the video without a seek bar
- You can use the arrow keys (<-, ->) on your keyboard for 10 second time jumps
- If a video is run in Spoiler-Free Mode, Open End adds a quick navigation toolbar which you can use to make larger time jumps
- The length of the time jumps can be specified in the same format as twitch time stamps
  - E.g. \"2\" for 2 minutes or \"1h2m3s\" for 1 hour, 2 minutes and 3 seconds".
- When you hit Enter while being in the time jump text field, a forward jump is triggered 

### 3.5 Customize what information about videos in video lists is hidden
1. Click on the Open End icon in the Chrome toolbar. A popup opens
2. On the popup click on "Options..."
3. Go to the section "Items in video lists"
4. Check/uncheck the options under that section according to your preferences  

### 3.6 Basic MLG support for the OWL pre-season matches
The version "0.2.0 (BETA)" includes very basic MLG support. This means:
- To enable the Spoiler-Free Mode on MLG.com, you have to select "Enable Spoiler-Free Mode: [x] Always" on the toolbar icon popup or in the options
- When the Spoiler-Free Mode is enabled, the progress bar and the duration of videos on mlg.com are hidden
  - You can toggle the visibility by switching between "[x] Never" and "[x] Always"
- There is no Open End toolbar or feature to hide information of videos in video lists yet

## 4. Roadmap and Version Notes
[See here](VERSION_NOTES.md)

## 5. Contact
If you have questions or feature requests you can contact me:
- Mail: [snowwits@gmail.com](mailto:snowwits@gmail.com)
- Reddit: [/u/snowwits](https://www.reddit.com/user/snowwits)

## 6. License
[Apache License 2.0](LICENSE.md)

## 7. Credits
- Google: Material Design icons
  - https://www.flaticon.com/packs/material-design
- Krish Masand: Author of the Anticipation Chrome extension which has been an inspiration
  - https://github.com/krishmasand/Anticipation-Chrome
