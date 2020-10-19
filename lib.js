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
	
	NodeList.prototype.on = ElementList.prototype.on = function on() {
		var i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			this[i].on.apply(this[i], arguments);
		}
		
		// allow methods chaining:
		return this;
	};
	
	NodeList.prototype.off = ElementList.prototype.off = function off() {
		var i, len = this.length;
		
		for (i = 0; i < len; ++i) {
			this[i].off.apply(this[i], arguments);
		}
		
		// allow methods chaining:
		return this;
	};
	
	
	// test
	HTMLDocument.prototype.find = Element.prototype.find = function find(selector) {
		var results = this.querySelectorAll(selector);
		return results.length === 1 ? results[0] : results;
	};
	
	NodeList.prototype.find = ElementList.prototype.find = function find(selector) {
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
	Element.prototype.appendTo = function appendTo(element) {
		var element = typeof(element) === 'string' ? document.find(element)[0] : element[0];
		
		if (element && 'appendChild' in element) {
			element.appendChild(this);
		}
		
		// allow methods chaining:
		return this;
	};
	
	Element.prototype.insertAfter = function insertAfter(element) {
		var element = typeof(element) === 'string' ? document.find(element)[0] : element[0];
		
		if (element && element.nextSibling) {
			element.parentNode.insertBefore(this, element.nextSibling);
		}
		
		// allow methods chaining:
		return this;
	};
	
	Element.prototype.remove = function remove() {
		var parent = this.parentNode;
		parent && parent.removeChild(this);
	};
	
	// alias of document.find in the global context:
	var _alias = '';
	
	// set an alias of document.find in window context:
	document.find.setAlias = function setAlias(alias) {
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
	Event.prototype.composedPath = Event.prototype.composedPath || function composedPath() {
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
	
	Window.prototype.on = HTMLDocument.prototype.on = Element.prototype.on = function on() {
		if (!('eventListenersList' in this)) {
			// create a cache of event listeners attached:
			this.eventListenersList = [];
		}
		
		// object representing the listener:
		var listener = {
			eventName: null, // string
			delegate: null, // selector as a string, matching element delegates, for event delegation
			handler: null // the function to trigger at the event
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
	
	Window.prototype.off = HTMLDocument.prototype.off = Element.prototype.off = function off() {
		if (!('eventListenersList' in this)) {
			// create a cache of event listeners attached, if not existing:
			this.eventListenersList = [];
			// quit, as no handler has been attached:
			return this;
		}
		
		if (arguments.length === 0) {
			// no argument given, remove all the listeners on the current targetElement:
			// .off()
			for (i = 0; i < this.eventListenersList.length; ++i) {
				var listener = this.eventListenersList[i];
				
				if ('removeEventListener' in this) {
					this.removeEventListener(listener.eventName, listener.handler.proxy || listener.handler);
				} else {
					this.detachEvent('on' + listener.eventName, listener.handler.proxy || listener.handler);
				}

				// remove the listener found:
				listener = listener.splice(i, 1);
				// update the counter, as an array element has been removed:
				i--;
			};
			
			// empty listeners cache:
			this.eventListenersList = [];
			
		} else if (arguments.length === 1 && typeof arguments[0] === 'string') {
			// event only has been specified:
			// .off(eventName)
			var eventName = arguments[0];

			for (var i = 0; i < this.eventListenersList.length; ++i) {
				var listener = this.eventListenersList[i];

				if (listener.eventName === eventName) {
					if ('removeEventListener' in this) {
						this.removeEventListener(listener.eventName, listener.handler.proxy || listener.handler);
					} else {
						this.detachEvent('on' + listener.eventName, listener.handler.proxy || listener.handler);
					}
					
					// remove the listener found:
					this.eventListenersList.splice(i, 1);
					// update the counter, as an array element has been removed:
					i--;
				}
			}
		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
			// event and handler specified:
			// .off(eventName, handler)
			var eventName = arguments[0],
				handler = arguments[1];
			
			for (var i = 0; i < this.eventListenersList.length; ++i) {
				var listener = this.eventListenersList[i];

				if (listener.eventName === eventName && listener.handler === handler) {
					if ('removeEventListener' in this) {
						this.removeEventListener(listener.eventName, listener.handler.proxy || listener.handler);
					} else {
						this.detachEvent('on' + listener.eventName, listener.handler.proxy || listener.handler);
					}
					
					// remove the listener found:
					this.eventListenersList.splice(i, 1);
					// update the counter, as an array element has been removed:
					i--;
				}
			}
		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
			// event delegation, the second argument is a selector to match delegate elements:
			// .off(eventName, delegate, handler)
			var eventName = arguments[0],
				delegate = arguments[1],
				handler = arguments[2];
			
			for (var i = 0; i < this.eventListenersList.length; ++i) {
				var listener = this.eventListenersList[i];

				if (listener.eventName === eventName && listener.delegate === delegate && listener.handler === handler) {
					if ('removeEventListener' in this) {
						this.removeEventListener(listener.eventName, listener.handler.proxy || listener.handler);
					} else {
						this.detachEvent('on' + listener.eventName, listener.handler.proxy || listener.handler);
					}
					
					// remove the listener found:
					this.eventListenersList.splice(i, 1);
					// update the counter, as an array element has been removed:
					i--;
				}
			}
		}
		
		// allow methods chaining:
		return this;
	};
	
	HTMLDocument.prototype.ready = function ready(callback) {
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
	
	Window.prototype.load = function load(callback) {
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


