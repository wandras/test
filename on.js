/*
* DOM enhancement
* Implementation of .on() and .off() methods on Element, Window and HTMLDocument
* Used event bubbling as default setting
*/

Window.prototype.on = HTMLDocument.prototype.on = Element.prototype.on = function(eventName, callback) {
    if ('addEventListener' in this) {
        return this.addEventListener(eventName, callback, false);
    } else if ('attachEvent' in this) {
        return this.attachEvent('on' + eventName, callback);
    }
};

Window.prototype.off = HTMLDocument.prototype.off = Element.prototype.off = function(eventName, callback) {
    if ('removeEventListener' in this) {
        return this.removeEventListener(eventName, callback, false);
    } else if ('detachEvent' in this) {
        return this.detachEvent('on' + eventName, callback);
    }
};

