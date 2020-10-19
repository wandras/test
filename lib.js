/*
* DOM enhancement
* Implementation of .on() and .off() methods on Element, Window and HTMLDocument
* Used event bubbling as default setting
*/

(function() {
	Object.defineProperties(Element.prototype, {
		// Allow zero-index get on HTML nodes to return themselves:
		0: {
			get: function() { return this; }
		},
		// define the item method, as Array's method is not applicable:
		'item': {
			value: function(i) { return this[i]; }
		},
		// define length as for collections; all the elements have length set to 1
		'length': {
			get: function() {
				return 1;
			}
		},
		'index': {
			get: function() {
				return Array.from(this.parentNode.children).indexOf(this);
			}
		}
	});
	
	
	// Constructor of a specialized object to contain elements as NodeList does:
	function ElementList() {
		var args = Array.prototype.slice.call(arguments), 
			i, len = args.length;
		this.length = len;
		
		for (i = 0; i < len; ++i) {
			this[i] = args[i];
		}
		
		return this;
	};
	
	// inherit from Array:
	ElementList.prototype = Array.prototype;
	
	// expose globally:
	window.ElementList = ElementList;
	
	NodeList.prototype.on = ElementList.prototype.on = function() {
		var i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			this[i].on.apply(this[i], arguments);
		}
		
		// allow methods chaining:
		return this;
	};
	
	NodeList.prototype.off = ElementList.prototype.off = function() {
		var i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			this[i].off.apply(this[i], arguments);
		}
		
		// allow methods chaining:
		return this;
	};
	
	
	// test
	HTMLDocument.prototype.find = Element.prototype.find = function(selector) {
		var results = this.querySelectorAll(selector);
		return results.length === 1 ? results[0] : results;
	};
	
	NodeList.prototype.find = ElementList.prototype.find = function(selector) {
		var results = new ElementList(),
			i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			var matches = this[i].find(selector);
			
			if (matches.length > 0) {
				results.push(this[i]);
			}
		}
		
		return results.length === 1 ? results[0] : results;
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
	Element.prototype.appendTo = function(element) {
		var element = typeof(element) === 'string' ? document.find(element)[0] : element[0];
		
		if (element && 'appendChild' in element) {
			element.appendChild(this);
		}
		
		// allow methods chaining:
		return this;
	};
	
	Element.prototype.insertAfter = function(element) {
		var element = typeof(element) === 'string' ? document.find(element)[0] : element[0];
		
		if (element && element.nextSibling) {
			element.parentNode.insertBefore(this, element.nextSibling);
		}
		
		// allow methods chaining:
		return this;
	};
	
	Element.prototype.remove = function() {
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
	// Necessary polyfill for browsers not implementing Event.prototype.composedPath:
	Event.prototype.composedPath = Event.prototype.composedPath || function() {
		var target = this.target || null;
		
		if (!target || !target.parentElement) {
			return [];
		}
		
		var path = [target];
		
		while (target.parentElement) {
			target = target.parentElement;
			path.push(target);
		}
		
		path.push(document, window);
		return path;
	};
	
	Window.prototype.on = HTMLDocument.prototype.on = Element.prototype.on = function() {
		if (!('eventListenersList' in this)) {
			// create a cache of event listeners attached:
			this.eventListenersList = [];
		}
		
		// prepare the event argument:
		var listener = {
			eventName: null,
			delegate: null,
			handler: null
		};
		
		if (typeof arguments[0] === 'string') {
			// eventType must be always a string
			var eventName = arguments[0];
			listener.eventName = eventName;
			
			if (arguments.length > 1 && typeof arguments[1] === 'function') {
				// args: [eventName, handler]
				var handler = arguments[1];
				listener.handler = handler;
				
				// cache the listeners added to the target:
				this.eventListenersList.push(listener);
				
				if ('addEventListener' in this) {
					// W3C compliant method
					this.addEventListener(eventName, handler, false);
				} else {
					// environment using attachEvent and detachEvent methods
					this.attachEvent('on' + eventName, handler);
				}
				
			} else if (arguments.length > 2 && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
				// args: [eventName, delegate, handler]
				var delegate = arguments[1],
					handler = arguments[2];
				
				// prepare the arguments to log:
				listener.delegate = delegate;
				listener.handler = handler;
				
				// in event delegation, handler is wrapped
				var proxy = function proxy(e) {
					if ('is' in e.target && e.target.is(delegate)) {
						return handler.call(e.target, e);
					}
				};
				
				// reference the delegated handler as a property of the original one:
				listener.handler.proxy = proxy;
				// save in the proxy a reference to the original callback:
				proxy.origin = handler;
				
				
				// cache the listeners added to the target:
				this.eventListenersList.push(listener);
				
				if ('addEventListener' in this) {
					// W3C compliant method
					this.addEventListener(eventName, proxy, false);
				} else {
					// environment using attachEvent and detachEvent methods
					this.attachEvent('on' + eventName, proxy);
				}
			}
		}
		
		// allow methods chaining:
		return this;
	};
	
	Window.prototype.off = HTMLDocument.prototype.off = Element.prototype.off = function() {
		if (!('eventListenersList' in this)) {
			// create a cache of event listeners attached, if not existing:
			this.eventListenersList = [];
			// quit, as no handler has been attached:
			return this;
		}
		
		// define the removal method:
		var removalMethod = 'removeEventListener' in this ? 'removeEventListener' : 'detachEvent';
		
		if (arguments.length === 0) {
			/**
				.off()
			**/
			// no argument given, remove all the listeners on the current targetElement:
			var i = 0, len = this.eventListenersList.length;
			
			for (i = 0; i < len; ++i) {
				var listener = this.eventListenersList[i];
				
				if ('detachEvent' in this) {
					// fix the event name and remove unneeded arguments:
					listener.eventName += 'on';
				}

				this[removalMethod](listener.eventName, listener.handler.proxy || listener.handler);
				listener = listener.slice(0, 2);
			};
			
			// empty listeners cache:
			this.eventListenersList = [];
			
		} else if (arguments.length === 1 && typeof arguments[0] === 'string') {
			/**
				.off(eventName)
			**/
			// only event type specified, remove all listeners of the given event
			var eventName = arguments[0],
				i,
				len = this.eventListenersList.length;
			
			for (i = 0; i < len; ++i) {
				var listener = this.eventListenersList[i];
				if (listener.eventName === eventName) {
					
					if ('detachEvent' in this) {
						// fix the event name:
						listener.eventName += 'on';
					}
					
					this[removalMethod](listener.eventName, listener.handler.proxy || listener.handler);
					
					// remove the listener found:
					this.eventListenersList.splice(i, 1);
				}
			}
		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
			/**
				.off(eventName, handler)
			**/
			// only event type specified, remove all listeners of the given event
			var eventName = arguments[0],
				handler = arguments[1],
				i,
				len = this.eventListenersList.length;
			
			for (i = 0; i < len; ++i) {
				var listener = this.eventListenersList[i];
				if (listener.eventName === eventName && listener.handler === handler) {
					
					if ('detachEvent' in this) {
						// fix the event name:
						listener.eventName += 'on';
					}
					
					this[removalMethod](listener.eventName, listener.handler.proxy || listener.handler);
					
					// remove the listener found:
					this.eventListenersList.splice(i, 1);
				}
			}
		} else if (typeof arguments[0] === 'string' && typeof arguments[2] === 'function') {
			/**
				.off(eventName, delegate, handler)
			**/
			if (typeof arguments[1] === 'string') {
				// event delegation, the second argument is a selector
				// arguments: [eventName, delegate, handler]
				var eventName = arguments[0],
					delegate = arguments[1],
					handler = arguments[2];
				
				// prepare the event arguments for removeEventListener:
				var i = 0, len = this.eventListenersList.length;

				for (i = 0; i < len; ++i) {
					var listener = this.eventListenersList[i];

					if (listener.eventName === eventName && listener.delegate === delegate && listener.handler === handler) {
						if ('detachEvent' in this) {
							// fix the event name and remove unneeded arguments:
							listener.eventName += 'on';
						}
						
						// eventName given, remove only the specified listener
						this[removalMethod](listener.eventName, listener.handler.proxy || listener.handler);

						// remove the listener found:
						this.eventListenersList.splice(i, 1);
						// ...and quit the loop:
						break;
					}
				}
			}
		}
		
		// allow methods chaining:
		return this;
	};
	
	HTMLDocument.prototype.ready = function(callback) {
		if (this.readyState === 'interactive' || this.readyState === 'complete') {
			callback();
		} else if ('addEventListener' in this) {
			this.addEventListener('DOMContentLoaded', callback, false);
		} else if ('attachEvent' in this) {
			// document not loaded, not compliant browser:
			this.attachEvent('onreadystatechange', function(e) {
				if (this.readyState === "complete") {
					callback();
				}
			});
		}
		
		// allow methods chaining:
		return this;
	};
	
	Window.prototype.load = function(callback) {
		if (this.document.readyState === 'complete') {
			// the document has been loaded:
			callback();
		} else if ('addEventListener' in this) {
			// document not loaded:
			this.addEventListener('load', callback, false);
		} else if ('attachEvent' in this) {
			// document not loaded, not compliant browser:
			this.attachEvent('onload', callback);
		}
		
		// allow methods chaining:
		return this;
	};
	
	Element.prototype.is = Element.prototype.matchesSelector || Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector ||
	Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || function is(selector) {
		var node = this,
			nodes = (node.parentNode || node.document).querySelectorAll(selector),
			i = -1;
		while (nodes[++i] && nodes[i] != node);
		return !!nodes[i];
	};

	Window.prototype.is = HTMLDocument.prototype.is = function is(obj) {
		return obj === this;
	};
})();
