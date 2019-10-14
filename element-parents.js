/*
* DOM enhancement
* Element.parents implementation
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
    enumerable: true,
    configurable: false,
    writable: false
});

