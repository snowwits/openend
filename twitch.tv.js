var AVAILIBILITY_CHECK_INTERVAL = 200;
var AVAILIBILITY_CHECK_TIMEOUT = 30000;
var DEFAULT_SEEK_AMOUNT = 10.0;

var showProgress = false;
var initStartTime = null;

function handleToggleProgressAction() {
	console.log("OPENEND: Handling toggle Open End action");

	// Toggle 
	showProgress = !showProgress;
	
	updateProgressVisibility();
}

function updateProgressVisibility() {
	// Make progress indicators visible / invisible
	var toggleClasses = ["player-seek__time--total", "js-player-slider"];
	for (i = 0; i < toggleClasses.length; i++) {
		var toggleClass = toggleClasses[i];
		var elements = document.getElementsByClassName(toggleClass);
		for(j = 0; j < elements.length; j++) {
			var element = elements[j];
			if(showProgress) {
				element.style.display = "block";
			}
			else {
				element.style.display = "none";
			}
		}
	}	
	
	// Update the button label
	var oe_toggleProgressBtn = document.getElementById("oe-toggle-progress");
	oe_toggleProgressBtn.innerHTML = showProgress ? "Hide progress" : "Show progress";
}

function init(){
	console.log("OPENEND: Initializing");
	initStartTime = Date.now();
	
	injectUtilSpan();
}

function injectUtilSpan() {
	// Build util span
	var oe_utilSpan = document.createElement("span");
	oe_utilSpan.setAttribute("id", "openend-util")

	// Built Open End icon img
	var oe_iconImg = document.createElement("img");
	var oe_iconImgUrl = chrome.extension.getURL("icon_16.png");
	oe_iconImg.setAttribute("src", oe_iconImgUrl);
	oe_iconImg.setAttribute("alt", "Open End Chrome Extension")
	// Add "Open End icon" img to util span
	oe_utilSpan.appendChild(oe_iconImg);
	
	// Built "Toggle Progress" button
	var oe_toggleProgressBtn = document.createElement("button");
	oe_toggleProgressBtn.setAttribute("id", "oe-toggle-progress");
	oe_toggleProgressBtn.onclick = handleToggleProgressAction;
	// Add "Toggle Open End" button to util span
	oe_utilSpan.appendChild(oe_toggleProgressBtn);

	// Inject util span into player seek time container
	var playerSeekTimeContainers = document.getElementsByClassName("player-seek__time-container");
	if(playerSeekTimeContainers.length != 1){
		console.log("OPENEND: WARN: div.player-seek__time-container not available yet.")
		if(AVAILIBILITY_CHECK_TIMEOUT > Date.now() - initStartTime) {
			console.log("Checking again in "+AVAILIBILITY_CHECK_INTERVAL+" ms...");
			setTimeout(init, AVAILIBILITY_CHECK_INTERVAL);	
		} else {
			console.log("Check timeout of " + AVAILIBILITY_CHECK_TIMEOUT + " ms reached. Could not add open end utility to the twitch page.");
		}
	} else {
		var playerSeekTimeContainer = playerSeekTimeContainers[0];
		console.log("OPENEND: INFO: div.player-seek__time-container available: " + playerSeekTimeContainer);
		playerSeekTimeContainer.appendChild(oe_utilSpan);
	}
	
	// Set initial visibility
	updateProgressVisibility();
}

window.onload = init;