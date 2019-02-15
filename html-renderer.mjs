/**
 * Renders a VDOM into a string without triggering mount and render for any sub components.
 * @param {Object} vdom a vdom node
 * @returns {string} the HTML string rendered
 */
export function renderShallow(vdom) {
    const vnode = vdom;
    let result = '';

    if (typeof vnode === 'string') {
        result += vnode;
    } else if (vnode) {
        if (typeof vnode.nodeName !== 'string') {
            // shallow render
            vnode.nodeName = vnode.nodeName.name || 'UnknownComponent';
        }
        const attributes = Object.keys(vnode.attributes).map(attribute => `${attribute}="${vnode.attributes[attribute]}"`).join(' ');
        result += `<${vnode.nodeName}${attributes ? ` ${attributes}` : ''}>${vnode.children.map(renderShallow).join('')}</${vnode.nodeName}>`;
    }

    return result;
}

/**
 * Renders a VDOM into a string
 * @param {Object} vdom a vdom node
 * @param {Object} options the reference to the options object provided by the component.js
 * @param {Object} context the inherited component context
 * @returns {string} with the HTML string rendered
 */
export function render(vdom, options, context) {
    const vnode = vdom;
    const optionsRef = options;
    let result = '';

    if (typeof vnode === 'string' || !vnode) {
        return vnode;
    }

    if (typeof vnode.nodeName !== 'string') {
        const Component = vnode.nodeName;
        let instance;
        if (Component.prototype && Component.prototype.render) {
            instance = new Component(Object.assign({}, vnode.attributes, { children: vnode.children }), context);
        } else {
            instance = new optionsRef.baseClass(Object.assign({}, vnode.attributes, { children: vnode.children }), context); // eslint-disable-line new-cap
            instance.render = Component.bind(instance);
        }
        const oldOptionsApplyVDOM = optionsRef.applyVDOM;
        optionsRef.applyVDOM = (target, source, newContext) => {
            result += render(source, optionsRef, newContext);
            return target;
        };
        instance.mount({});
        optionsRef.applyVDOM = oldOptionsApplyVDOM;

        return result;
    }
    const attributes = Object.keys(vnode.attributes).map(attribute => `${attribute}="${vnode.attributes[attribute]}"`).join(' ');
    const children = vnode.children.map(child => render(child, optionsRef, context));
    return `<${vnode.nodeName}${attributes ? ` ${attributes}` : ''}>${children.join('')}</${vnode.nodeName}>`;
}
