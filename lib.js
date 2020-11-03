/*
* DOM enhancement
* Implementation of .on() and .off() methods on Element, Window and HTMLDocument
* Used event bubbling as default setting
*/

(function() {
	Object.defineProperties(Element.prototype, {
		// Allow zero-index get on HTML nodes to return themselves:
		0: {
			get: function() {
				return this;
			}
		},
		// define the item method, as Array's method is not applicable:
		'item': {
			value: function(i) {
				return this[i];
			}
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
		},
		'parents': {
			// not implemented as method, like in jQuery, as native DOM has already Element.prototype.parent as an attribute
			get: function() {
				var parent = this.parentElement,
				parents = [];

				while (parent) {
					parents.shift(parent);
					parent = element.parentNode;
				}
				return parents;
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

	// MUST ADD to NodeList and ElementList:
	// index
	// parent
	// parents
	// DOM traversing and manipulation attributes and methods
	
	// All the properties added must be kept not enumerable

	Object.defineProperties(NodeList.prototype, {
		'index': {
			get: function() {
				return this.length > 0 ? 0 : -1;
			},
			set: function() {}
		}
	});
	

	// test
	HTMLDocument.prototype.find = Element.prototype.find = function find(selector) {
		var results = this.querySelectorAll(selector);
		return results.length === 1 ? results[0] : results;
	};
	
	NodeList.prototype.find = ElementList.prototype.find = function find(selector) {
		var results = new ElementList();
		
		for (var i = 0, len = this.length; i < len; ++i) {
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
	
	NodeList.prototype.remove = ElementList.prototype.remove = function remove() {
		for (var i = this.length - 1; i >= 0; --i) {
			this[i].remove();
		}
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
			// create the cache of event listeners:
			this.eventListenersList = [];
		}
		
		var eventTypes = [], // array of eventTypes (strings)
			delegate = null, // selector as a string, matching element delegates, for event delegation
			handler = null, // the function to trigger at the event
			proxy = null; // the delegate handler, in case of event delegation

		if (typeof arguments[0] === 'string') {
			// eventType must be always a string; split by whitespaces into an array:
			eventTypes = arguments[0].trim().split(/\s+/);
			
			if (arguments.length > 1 && typeof arguments[1] === 'function') {
				// .on(eventType, handler)
				handler = arguments[1];
				
			} else if (arguments.length > 2 && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
				// .on(eventType, delegate, handler)
				delegate = arguments[1];
				handler = arguments[2];
				
				// in event delegation, handler is wrapped
				proxy = function proxy(e) {
					if ('is' in e.target && e.target.is(delegate)) {
						return handler.call(e.target, e);
					}
				};
			}

			for (var i = 0; i < eventTypes.length; ++i) {
				var eventType = eventTypes[i],
					newListener = { eventType: eventType, delegate: delegate, handler: handler, proxy: proxy },
					registered = false;
				
				for (var j = 0; j < this.eventListenersList.length; ++j) {
					var listener = this.eventListenersList[j];
					
					// check if the listener has been already registered:
					if (newListener.eventType === listener.eventType && newListener.delegate === listener.delegate && newListener.handler === listener.handler && newListener.proxy === listener.proxy) {
						registered = true;
						break;
					}
				}

				if (registered === false) {
					// cache the listeners added to the target:
					this.eventListenersList.push(newListener);
					
					if ('addEventListener' in this) {
						this.addEventListener(eventType, proxy || handler, false);
					} else {
						this.attachEvent('on' + eventType, proxy || handler);
					}
				}
			}
		}
		
		// allow methods chaining:
		return this;
	};
	
	Window.prototype.off = HTMLDocument.prototype.off = Element.prototype.off = function off() {
		if (!('eventListenersList' in this)) {
			// create the cache of event listeners, if not existing:
			this.eventListenersList = [];
		}
		
		var eventTypes = [], // array of eventTypes (strings)
			delegate = null, // selector as a string, matching element delegates
			handler = null; // the function to detach from the target
		
		if (arguments.length === 0) {
			// .off()
			eventTypes.push(null);
		} else if (arguments.length === 1 && typeof arguments[0] === 'string') {
			// .off(eventType)
			eventTypes = arguments[0].trim().split(/\s+/);
			
		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
			// .off(eventType, handler)
			eventTypes = arguments[0].trim().split(/\s+/);
			handler = arguments[1];
			
		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
			// .off(eventType, delegate, handler)
			eventTypes = arguments[0].trim().split(/\s+/);
			delegate = arguments[1];
			handler = arguments[2];
		} else {
			// different combos are not accepted, quit allowing methods chaining:
			return this;
		}
		
		if (eventTypes.length === 0) {
			// no eventType specified, push a null element to match all
			eventTypes.push(null);
		}

		for (var i = 0; i < eventTypes.length; ++i) {
			var eventType = eventTypes[i];
			for (var j = 0; j < this.eventListenersList.length; ++j) {
				var listener = this.eventListenersList[j];
				if (
					(eventType === null && handler === null && delegate === null) || // .off()
					(eventType !== null && eventType === listener.eventType && handler === null && delegate === null) || // .off(eventType)
					(eventType !== null && eventType === listener.eventType && handler !== null && handler === listener.handler && delegate === null) || // .off(eventType, handler)
					(eventType !== null && eventType === listener.eventType && handler !== null && handler === listener.handler && delegate !== null && delegate === listener.delegate) // .off(eventType, delegate, handler)
				) {
					if ('removeEventListener' in this) {
						this.removeEventListener(listener.eventType, listener.proxy || listener.handler);
					} else {
						this.detachEvent('on' + listener.eventType, listener.proxy || listener.handler);
					}
					
					// remove the listener found:
					this.eventListenersList.splice(j, 1);
					j--; // update the counter, as an array element has been removed:
				}
			}
		}
		
		// allow methods chaining:
		return this;
	};

	NodeList.prototype.on = ElementList.prototype.on = function on() {
		for (var i = 0, len = this.length; i < len; ++i) {
			this[i].on.apply(this[i], arguments);
		}
		// allow methods chaining:
		return this;
	};
	
	NodeList.prototype.off = ElementList.prototype.off = function off() {
		for (var i = 0, len = this.length; i < len; ++i) {
			this[i].off.apply(this[i], arguments);
		}
		// allow methods chaining:
		return this;
	};
	
	Element.prototype.css = function css() {
		if (arguments.length === 1 && typeof(arguments[0]) === 'string') {
			// getter: .css(prop)
			var prop = arguments[0],
				computedStyle = window.getComputedStyle(this, null);
			return (prop in computedStyle) && computedStyle[prop] || undefined;
		} else {
			var style = {}; // the style object

			if (typeof(arguments[0]) === 'string' && typeof(arguments[1]) === 'string') {
				// setter: .css(prop, value)
				style[arguments[0]] = arguments[1];
			} else if (typeof (arguments[0]) === 'object') {
				// setter: .css({ prop1: value1, prop2, value2... })
				style = arguments[0];
			}

			for (var prop in style) {
				this.style[prop] = style[prop];
			}
			
			// allow methods chaining:
			return this;
		}
	};

	// direct getters of element geometry values
	Object.defineProperties(Element.prototype, {
		'x': {
			get: function() { return this.getBoundingClientRect().x; }
		},
		'y': {
			get: function() { return this.getBoundingClientRect().y; }
		},
		'width': {
			get: function() { return this.getBoundingClientRect().width; }
		},
		'height': {
			get: function() { return this.getBoundingClientRect().height; }
		},
		'top': {
			get: function() { return this.getBoundingClientRect().top; }
		},
		'right': {
			get: function() { return this.getBoundingClientRect().right; }
		},
		'bottom': {
			get: function() { return this.getBoundingClientRect().bottom; }
		},
		'left': {
			get: function() { return this.getBoundingClientRect().left; }
		}
	});

	
	// list of properties defined for single elements to transfer to NodeList and ElementList:
	var elemProps = ['insertAfter', 'appendTo'];
	elemProps.forEach(function(prop, i) {
		if (!(prop in NodeList.prototype)) {
			NodeList.prototype[prop] = function() {
				if (this.length > 0) {
					return this[0][prop].apply(this, arguments);
				}
			};
		}
		if (!(prop in ElementList.prototype)) {
			ElementList.prototype[prop] = function() {
				if (this.length > 0) {
					return this[0][prop].apply(this, arguments);
				}
			};
		}
	});
	
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
