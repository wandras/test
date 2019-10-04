/*
* DOM enhancement
* Implementation of .on() and .off() methods on Element, Window and HTMLDocument
* Used event bubbling as default setting
*/

Window.prototype.on = HTMLDocument.prototype.on = Element.prototype.on = function(eventName, callback, options) {
	if (!('eventListenersList' in this)) {
		// create a cache of event listeners attached:
		this.eventListenersList = [];
	}
	
	// cache the listeners added to the target:
	this.eventListenersList.push(arguments);
	
	if ('addEventListener' in this) {
		// W3C compliant method
		this.addEventListener.apply(this, arguments);
	} else {
		// environment using attachEvent and detachEvent methods
		this.attachEvent('on' + eventName, callback);
	}
	
	// allow methods chaining:
	return this;
};

Window.prototype.off = HTMLDocument.prototype.off = Element.prototype.off = function(eventName, callback, useCapture) {
	if (!('eventListenersList' in this)) {
		// create a cache of event listeners attached, if not existing:
		this.eventListenersList = [];
	}
	
	// set the removal method:
	var removalMethod = 'removeEventListener' in this ? 'removeEventListener' : 'detachEvent';
	
	if (arguments.length > 1) {
		// create a copy of the arguments array for fixing the event name later if needed:
		var removalArg = arguments;
		
		if ('detachEvent' in this) {
			removalArg[0] = 'on' + removalArg[0];
		}
		
		// eventName given, remove only the specified listener
		this[removalMethod].apply(this, removalArg);
		
		for (var i = 0; i < this.eventListenersList.length; ++i) {
			if (this.eventListenersList[i][0] === eventName && this.eventListenersList[i][1] === callback) {
				// remove the listener found and quit the loop:
				this.eventListenersList.splice(i, 1);
				break;
			}
		}
	} else if (arguments.length === 1) {
		// only event type specified, remove all listeners of the given event
		for (var i = 0; i < this.eventListenersList.length; ++i) {
			if (this.eventListenersList[i][0] === eventName) {
				// remove the listener without specifying event options, they have not been given:
				var removalArg = [eventName, this.eventListenersList[i][1]];
				
				if ('detachEvent' in this) {
					removalArg[0] += 'on';
				}
				
				this[removalMethod].apply(this, removalArg);
				
				// remove the listener found and quit the loop:
				this.eventListenersList.splice(i, 1);
				break;
			}
		}
	} else {
		// no argument given, remove all the listeners on the current targetElement:
		for (var i = 0; i < this.eventListenersList.length; ++i) {
			var removalArg = this.eventListenersList[i];
			
			if ('detachEvent' in this) {
				removalArg[0] += 'on';
			}
			
			this[removalMethod].apply(this, removalArg);
		};
		
		// empty listeners cache:
		this.eventListenersList = [];
	}
	
	// allow methods chaining:
	return this;
};
