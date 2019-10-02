/*
* DOM enhancement
* Element.is() implementation
*/

Element.prototype.is =
Element.prototype.matchesSelector || 
Element.prototype.webkitMatchesSelector ||
Element.prototype.mozMatchesSelector ||
Element.prototype.msMatchesSelector ||
Element.prototype.oMatchesSelector ||
function(selector) {
    var node = this,
        nodes = (node.parentNode || node.document).querySelectorAll(selector),
        i = -1;
    while (nodes[++i] && nodes[i] != node);
    return !!nodes[i];
};
