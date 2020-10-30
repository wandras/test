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
		
		// object representing the listener:
		var listener = {
			eventType: null, // string
			delegate: null, // selector as a string, matching element delegates, for event delegation
			handler: null, // the function to trigger at the event
			proxy: null // the delegate handler, in case of event delegation
		};

		if (typeof arguments[0] === 'string') {
			// eventType must be always a string
			listener.eventType = arguments[0];
			
			if (arguments.length > 1 && typeof arguments[1] === 'function') {
				// .on(eventType, handler)
				listener.handler = arguments[1];
				
			} else if (arguments.length > 2 && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
				// .on(eventType, delegate, handler)
				listener.delegate = arguments[1];
				listener.handler = arguments[2];
				
				// in event delegation, handler is wrapped
				listener.proxy = function proxy(e) {
					if ('is' in e.target && e.target.is(listener.delegate)) {
						return listener.handler.call(e.target, e);
					}
				};
			}

			// cache the listeners added to the target:
			this.eventListenersList.push(listener);

			if ('addEventListener' in this) {
				this.addEventListener(listener.eventType, listener.proxy || listener.handler, false);
			} else {
				this.attachEvent('on' + listener.eventType, listener.proxy || listener.handler);
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
		
		var eventType = null,
			delegate = null,
			handler = null;
		
		if (arguments.length === 1 && typeof arguments[0] === 'string') {
			// .off(eventType)
			eventType = arguments[0];

		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
			// .off(eventType, handler)
			eventType = arguments[0];
			handler = arguments[1];
			
		} else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
			// .off(eventType, delegate, handler)
			eventType = arguments[0];
			delegate = arguments[1];
			handler = arguments[2];
		}
		
		for (var i = 0; i < this.eventListenersList.length; ++i) {
			var listener = this.eventListenersList[i];

			if (((eventType === null || eventType === listener.eventType) && (handler === null || handler === listener.handler) && (delegate === null || delegate === listener.delegate))) {
				if ('removeEventListener' in this) {
					this.removeEventListener(listener.eventType, listener.proxy || listener.handler);
				} else {
					this.detachEvent('on' + listener.eventType, listener.proxy || listener.handler);
				}
				
				// remove the listener found:
				this.eventListenersList.splice(i, 1);
				// update the counter, as an array element has been removed:
				i--;
			}
		}
		
		// allow methods chaining:
		return this;
	};

	// list of properties defined for single elements to transfer to NodeList and ElementList:
	var elemProps = ['insertBefore', 'insertAfter', 'appendChild', 'appendTo'];
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
