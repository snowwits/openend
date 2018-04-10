# Hide Videos Feature

## development steps

1. try hide videos on twitch.tv/overwatchleague that do not match `*day*`
2. formalize this rule in a js object, add a logic that executes it
3. add the formal rule to the options
4. show the formal rule in the options (read-only)
5. make it possible to add/edit/delete rules (except pre-defined ones)


## options

```javascript
sfmVideoListHideVideoRules = [
	{
		predefined: true,
		enabled: true,
		hideMatches: false,
		titlePattern: "*day*",
		titlePatternType: "SIMPLE|REGEX",
		channels: ["twitch.tv/overwatchleague"]
	}];
```

## UI


```
Rules

[x] Only show *day* videos on twitch.tv/overwatchleague    | (Predefined)
[Only show] videos which meet the following conditions:
    - Title matches      [ *day*                           ] [* = Wildcard]
    - Channel is one of  twitch.tv/overwatchleague
```