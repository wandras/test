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
	
	if ('addEventListener' in this) {
		// W3C compliant method
		if (typeof(options) === 'boolean') {
			var optionsValue = options;
		} else if (!!options) {
			var optionsValue = {
				useCapture: 'capture' in options ? options.capture || false,
				once: 'once' in options ? options.once || false,
				passive: 'passive' in options ? options.passive || false
			};
		}
		
		// cache the listeners added to the target:
		this.eventListenersList.push([eventName, callback, optionsValue]);
		return this.addEventListener(eventName, callback, optionsValue);
	} else {
		// environment using attachEvent and detachEvent methods
		// cache the listeners added to the target:
		this.eventListenersList.push([eventName, callback]);
		return this.attachEvent('on' + eventName, callback);
	}
};

Window.prototype.off = HTMLDocument.prototype.off = Element.prototype.off = function(eventName, callback, useCapture) {
	if (!('eventListenersList' in this)) {
		// create a cache of event listeners attached, if not existing:
		this.eventListenersList = [];
	}
	
	if ('removeEventListener' in this) {
		// W3C compliant method
		if (arguments.length > 0) {
			// eventName given, remove only the specified listener
			this.removeEventListener(eventName, callback, useCapture);
			
			this.eventListenersList.some(function(callbackObj, i) {
				if (callbackObj[1] === callback) {
					delete this.eventListenersList[i];
					return true;
				}
			});
		} else {
			// no argument given, remove all the listeners on the current targetElement:
			this.eventListenersList.some(function(callbackObj, i) {
				this.removeEventListener(callbackObj[0], callbackObj[1], callbackObj[2]);
				delete this.eventListenersList[i];
			});
		}
	} else {
		// environment using attachEvent and detachEvent methods
		if (arguments.length > 0) {
			// eventName given, remove only the specified listener
			this.detachEvent('on' + eventName, callback);
			
			this.eventListenersList.some(function(callbackObj, i) {
				if (callbackObj[1] === callback) {
					delete this.eventListenersList[i];
					return true;
				}
			});
		} else {
			// no argument given, remove all the listeners on the current targetElement:
			this.eventListenersList.some(function(callbackObj, i) {
				this.detachEvent('on' + callbackObj[0], callbackObj[1]);
				delete this.eventListenersList[i];
			});
		}
	}
};
