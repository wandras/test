/*
* DOM enhancement
* DOMElement.parents implementation
*/

Object.defineProperty(Element.prototype, "parents", {
    get: function() {
        var parent = this.parentElement,
            parents = [];
        
        while(parent) {
            parents.shift(parent);
            parent = element.parentNode;
        }
        return parents;
    },
    set: function() {},
    enumerable: true,
    configurable: true
});


