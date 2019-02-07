/* eslint-disable no-bitwise */
/**
 * Hashes a given string and returns the hash value
 * @param {string} str the string to hash
 * @returns {number} the hash value of the given string
 */
export function hash(str) {
    let result = 5381;
    let i = str.length;

    while (i) {
        result = (result * 33) ^ str.charCodeAt(i -= 1);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
    * integers. Since we want the results to be always positive, convert the
    * signed int to an unsigned by doing an unsigned bitshift. */
    return result >>> 0;
}
/* eslint-enable no-bitwise */

/**
 * Flattens the given array so that arrays within arrays will be resolved into a single-layer array
 * @param {Array} src the source array that needs flattening
 * @returns {Array} the flattened array
 */
export function flattenDeep(src) {
    return src.reduce((acc, val) => (Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val)), []);
}

/**
 * Creates a VDOM clone of a given DOM node
 * @param {DOMNode} node the DOM node to create a VDOM clone of
 * @param {Function} tag the vdom node creation function
 * @returns {Object} the resulting VDOM tree
 */
export function vdomClone(node, tag) {
    const attrs = {};
    if (node.nodeType === 3) return node.nodeValue;
    if (typeof node === 'string' || node.isVNode) return node;
    Array.from(node.attributes || []).forEach((attr) => {
        attrs[attr.name] = attr.value;
    });
    const childNodes = Array.from(node.childNodes || []).map(child => (child.nodeType === 3 ? child.nodeValue : vdomClone(child, tag)));
    return tag(node.nodeName.toLowerCase(), attrs, childNodes);
}

/**
 * Replaces circular dependencies in JS objects for use in JSON.stringify.
 * This function is based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value .
 * @returns {*} the values of the object without circular dependencies
 */
export function getCircularReplacer() {
    const seen = new WeakSet();

    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return undefined;
            }
            seen.add(value);
        }
        return value;
    };
}

export default {};
