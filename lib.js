/*
* DOM traversing and manipulation enhancements
* Event handling enhancements
*/

(function() {
	// set locally a shortcut for querySelectorAll:
	var $ = document.querySelectorAll.bind(document);
	
	// Allow zero-index get on HTML nodes to return themselves:
	Object.defineProperty(window.Element.prototype, 0, {
		get: function() { return this; }
	});
	
	// A specialized object to contain elements such as NodeList:
	function ElementList() {
		var args = Array.prototype.slice.call(arguments), 
			i, len = args.length;
		this.length = len;
		
		for (i = 0; i < len; ++i) {
			this[i] = args[i];
		}
		
		return this;
	}
	
	// inherit from Array:
	ElementList.prototype = Array.prototype;
	
	// define the item method, as Array's method is not applicable:
	Object.defineProperty(ElementList.prototype, 'item', {
    	value: function(i) { return this[i]; }
	});
	
	// expose globally:
	window.ElementList = ElementList;
	
	// all the elements have length set to 1
	Object.defineProperty(window.Element.prototype, 'length', {
		get: function() {
			return 1;
		}
	});
	
	window.Element.prototype.item = function(index) {
		return index === 0 ? this : null;
	};
	
	window.NodeList.prototype.on = ElementList.prototype.on = function(eventName, callback, options) {
		var i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			this[i].on.apply(this[i], arguments);
		}
		
		// allow methods chaining:
		return this;
	};
	
	window.NodeList.prototype.off = ElementList.prototype.off = function(eventName, callback, options) {
		var i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			this[i].off.apply(this[i], arguments);
		}
		
		// allow methods chaining:
		return this;
	};
	
	
	// test
	window.HTMLDocument.prototype.find = window.Element.prototype.find = function(selector) {
		var results = this.querySelectorAll(selector);
		return results.length === 1 ? results[0] : results;
	};
	
	window.NodeList.prototype.find = ElementList.prototype.find = function(selector) {
		var results = new ElementList(),
			i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			var matches = this[i].find(selector);
			
			if (matches.length > 0) {
				results.push(this[i]);
			}
		}
		
		return results;
	};
	
	// DOM manipulation
	/*
		Objectives:
			elem.insertBefore(someElem) // part of the DOM
			elem.insertAfter(someElem) // not existing
			elem.appendChild(someElem) // part of the DOM
			elem.appendTo(someElem) // not in standard DOM
			elem.remove() // not in standard DOM
	*/
	window.Element.prototype.appendTo = function(element) {
		var element = typeof(element) === 'string' ? document.find(element)[0] : element[0];
		
		if (element && 'appendChild' in element) {
			element.appendChild(this);
		}
	};
	
	window.Element.prototype.insertAfter = function(element) {
		var element = typeof(element) === 'string' ? document.find(element)[0] : element[0];
		
		if (element && element.nextSibling) {
			element.parentNode.insertBefore(this, element.nextSibling);
		}
	};
	
	window.Element.prototype.remove = function() {
		var parent = this.parentNode;
		parent && parent.removeChild(this);
	};
	
	// alias of document.find in the global context:
	var _alias = '';
	
	// set an alias of document.find in window context:
	document.find.setAlias = function(alias) {
		_alias = alias;
		window[alias] = function() {
			return document.find.apply(document, arguments);
		};
	};
	
	// get the alias of document.find in window context:
	document.find.getAlias = function() {
		if (_alias && _alias in window) {
			return _alias;
		}
	};
	
	// Event handling
	Window.prototype.on = window.HTMLDocument.prototype.on = window.Element.prototype.on = function(eventName, callback, options) {
		if (!('eventListenersList' in this)) {
			// create a cache of event listeners attached:
			this.eventListenersList = [];
		}
		
		// convert arguments to array:
		var eventArg = Array.prototype.slice.call(arguments);
		
		// cache the listeners added to the target:
		this.eventListenersList.push(eventArg);
		
		if ('addEventListener' in this) {
			// W3C compliant method
			this.addEventListener.apply(this, eventArg);
		} else {
			// environment using attachEvent and detachEvent methods
			this.attachEvent('on' + eventName, callback);
		}
		
		// allow methods chaining:
		return this;
	};
	
	Window.prototype.off = window.HTMLDocument.prototype.off = window.Element.prototype.off = function(eventName, callback, useCapture) {
		if (!('eventListenersList' in this)) {
			// create a cache of event listeners attached, if not existing:
			this.eventListenersList = [];
		}
		
		// define the removal method:
		var removalMethod = 'removeEventListener' in this ? 'removeEventListener' : 'detachEvent';
		
		if (arguments.length > 1) {
			// create a copy of the arguments array for fixing the event name later if needed:
			var eventArg = arguments.length > 0 ? Array.prototype.slice.call(arguments) : [];
			
			if ('detachEvent' in this) {
				// fix the event name:
				eventArg[0] += 'on';
				// remove unneeded arguments:
				eventArg = eventArg.slice(0, 2);
			}
			
			// eventName given, remove only the specified listener
			this[removalMethod].apply(this, eventArg);
			
			var i = 0, len = this.eventListenersList.length;
			
			for (i = 0; i < len; ++i) {
				if (this.eventListenersList[i][0] === eventName && this.eventListenersList[i][1] === callback) {
					// remove the listener found and quit the loop:
					this.eventListenersList.splice(i, 1);
					break;
				}
			}
		} else if (arguments.length === 1) {
			// only event type specified, remove all listeners of the given event
			var i = 0, len = this.eventListenersList.length;
			
			for (i = 0; i < len; ++i) {
				if (this.eventListenersList[i][0] === eventName) {
					// remove the listener without specifying event options, they have not been given:
					var eventArg = [eventName, this.eventListenersList[i][1]];
					
					if ('detachEvent' in this) {
						// fix the event name:
						eventArg[0] += 'on';
						// remove unneeded arguments:
						eventArg = eventArg.slice(0, 2);
					}
					
					this[removalMethod].apply(this, eventArg);
					
					// remove the listener found:
					this.eventListenersList.splice(i, 1);
				}
			}
		} else {
			// no argument given, remove all the listeners on the current targetElement:
			var i = 0, len = this.eventListenersList.length;
			
			for (i = 0; i < len; ++i) {
				var eventArg = this.eventListenersList[i];
				
				if ('detachEvent' in this) {
					// fix the event name:
					eventArg[0] += 'on';
					// remove unneeded arguments:
					eventArg = eventArg.slice(0, 2);
				}
				
				this[removalMethod].apply(this, eventArg);
			};
			
			// empty listeners cache:
			this.eventListenersList = [];
		}
		
		// allow methods chaining:
		return this;
	};
	
	window.HTMLDocument.prototype.ready = function(callback) {
		if (this.readyState === 'interactive' || this.readyState === 'complete') {
			callback();
		} else if ('addEventListener' in this) {
			this.addEventListener('DOMContentLoaded', callback, false);
		} else if ('attachEvent' in this) {
			this.attachEvent('onreadystatechange', callback);
		}
	};
	
	Window.prototype.load = function(callback) {
		if (this.document.readyState === 'complete') {
			callback();
		} else if ('addEventListener' in this) {
			this.addEventListener('load', callback, false);
		} else if ('attachEvent' in this) {
			this.attachEvent('onload', callback);
		}
	};
})();
