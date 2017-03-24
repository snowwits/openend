var AVAILIBITY_CHECK_INTERVAL = 200;
var DEFAULT_SEEK_AMOUNT = 10.0;

var showProgress = false;

function handleSeekAction() {
	console.log("OPENEND: Handling seek action");
}

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
		
	// Checking twitch player
	var player = null;
	if (player) {
		console.log("OPENEND: INFO: Access to Twitch player");
		console.log("OPENEND: INFO: Channel:" + player.getChannel());
		console.log("OPENEND: INFO: Video:" + player.getVideo());
		console.log("OPENEND: INFO: CurrentTime:" + player.getCurrentTime());
	}
	else {
		console.log("OPENEND: WARN: No access to Twitch player");
	}
	
	injectUtilSpan(player != null)
}

function injectUtilSpan(playerAvailable) {
	// Build util span
	var oe_utilSpan = document.createElement("SPAN");
	oe_utilSpan.setAttribute("id", "openend-util")

	// Built "Toggle Progress" button
	var oe_toggleProgressBtn = document.createElement("BUTTON");
	oe_toggleProgressBtn.setAttribute("id", "oe-toggle-progress");
	oe_toggleProgressBtn.onclick = handleToggleProgressAction;
	// Add "Toggle Open End" button to util span
	oe_utilSpan.appendChild(oe_toggleProgressBtn);
	
	if (playerAvailable){
		// Built "Skip" button
		var oe_seekBtn = document.createElement("BUTTON");
		oe_seekBtn.setAttribute("id", "oe-skip");
		oe_seekBtn.innerHTML = "Skip " + DEFAULT_SEEK_AMOUNT + "s";
		oe_seekBtn.onclick = handleSeekAction;
		// Add "Skip" button to util span
		oe_utilSpan.appendChild(oe_seekBtn);
	}

	// Inject util span into player seek time container
	var playerSeekTimeContainers = document.getElementsByClassName("player-seek__time-container");
	if(playerSeekTimeContainers.length != 1){
		console.log("OPENEND: WARN: div.player-seek__time-container not available yet. Checking again in "+AVAILIBITY_CHECK_INTERVAL+" ms...");
		setTimeout(init, AVAILIBITY_CHECK_INTERVAL, playerAvailable);
	} else {
		var playerSeekTimeContainer = playerSeekTimeContainers[0];
		console.log("OPENEND: INFO: div.player-seek__time-container available: " + playerSeekTimeContainer);
		playerSeekTimeContainer.appendChild(oe_utilSpan);
	}
	
	// Set initial visibility
	updateProgressVisibility();
}


init();