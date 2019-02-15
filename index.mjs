/* eslint-disable no-underscore-dangle, no-use-before-define */
import {
    hash, flattenDeep, vdomClone, getCircularReplacer,
} from './utils';

const jsxAttributeMap = {
    htmlFor: 'for',
    className: 'class',
};

const dirtyComponents = [];

/**
 * The Base class for all components
 */
export class Component {
    constructor(props, context) {
        this.state = {};
        this.context = context;
        this.updateProps(props);
    }

    render() {
        return 'Not implemented';
    }

    componentWillMount() {}

    componentDidMount() {}

    componentWillUnmount() {}

    componentWillReceiveProps() {}

    shouldComponentUpdate() {}

    componentWillUpdate() {}

    componentDidUpdate() {}

    componentDidCatch(error) {
        throw error;
    }

    updateProps(newProps) {
        // apply the new props
        this.componentWillReceiveProps(newProps, this.state);
        this.props = newProps || {};
        // remap children prop to vdom nodes, if existent
        if (this.props.children && !this.props.children.isVdom) {
            this.props.children = Array.from(this.props.children).map(node => (node.nodeType === 3 ? node.nodeValue : vdomClone(node, h)));
            this.props.children.isVdom = true;
        }
        if (this.shouldComponentUpdate(this.props, this.state) === false) return;
        // if the component is mounted, then re-render on prop change
        if (this.base) this.forceUpdate();
    }

    unmount() {
        options.beforeUnmount(this);
        this.componentWillUnmount();
        this.base._component = undefined;
        this.base.__preactattr_ = undefined;
        this.base = null;
    }

    /**
     * Mounts a component to a given node
     * @param {DOMNode} target the node to mount the component to
     */
    mount(target) {
        this.componentWillMount();
        this.base = target;
        this.forceUpdate();
        this.base._component = this;
        this.base.__preactattr_ = this.props;
        this.mounted = true;
        options.afterMount(this);
        this.componentDidMount();
    }

    setState(newState) {
        this.componentWillReceiveProps(this.props, newState);
        this.state = Object.assign({}, this.state, newState);
        if (this.shouldComponentUpdate(this.props, this.state) === false) return;
        /* istanbul ignore if */
        if (typeof requestAnimationFrame !== 'undefined') {
            this.dirtyTime = Date.now();
            if (dirtyComponents.indexOf(this) < 0) {
                dirtyComponents.push(this);
            }
        } else {
            this.forceUpdate();
        }
    }

    forceUpdate() {
        let vnode;
        this.componentWillUpdate();
        try {
            const tardy = Date.now() - this.dirtyTime;
            if (tardy > 150 && typeof console !== 'undefined') {
                console.warn(`Rendering of Component ${Object.getPrototypeOf(this).constructor.name} delayed by: ${tardy}ms`); // eslint-disable-line no-console
            }
            // render the VDOM based on current props and state
            vnode = this.render(this.props, this.state, this.context);

            // apply the VDOM to the actual DOM (meaning render the component into the browser)
            this.base = options.applyVDOM(this.base, vnode, this.context);
        } catch (error) {
            this.componentDidCatch(error);
        }
        options.afterUpdate(this);
        if (this.mounted) this.componentDidUpdate();
    }
}

export const options = {
    applyVDOM: applyDiff,
    baseClass: Component,
    afterMount: () => {},
    afterUpdate: () => {},
    beforeUnmount: () => {},
};

/**
 * Applies the changes between the given DOM element and the given VDOM element.
 *
 * @param {Node} target the element to apply the given VDOM element to
 * @param {Object} sourceElement the VDOM element to be applied to the given target element
 * @param {Object} context the context in which the current element is rendered
 * @returns {Node} the resulting target node (if changed)
 */
function applyDiff(target, sourceElement, context) {
    let targetElement = target;
    if (typeof sourceElement !== 'object' && sourceElement) {
        if (targetElement.nodeType === 1) { // element node
            targetElement.parentNode.replaceChild(targetElement.ownerDocument.createTextNode(sourceElement), targetElement);
        } else if (targetElement.nodeType === 3) {
            targetElement.nodeValue = sourceElement;
        }
        return targetElement;
    }
    if (!sourceElement) return targetElement;
    if (typeof sourceElement.nodeName === 'string') {
        // deal with tagname
        if (targetElement.hash === sourceElement.hash) return targetElement;
        if (targetElement.nodeType === 3) {
            const newTarget = targetElement.ownerDocument.createElement(sourceElement.nodeName);
            targetElement.parentNode.replaceChild(newTarget, targetElement);
            targetElement = newTarget;
        }
        if (targetElement.tagName.toLowerCase() !== sourceElement.nodeName.toLowerCase()) {
            const newElement = targetElement.ownerDocument.createElement(sourceElement.nodeName);
            if (targetElement._component) targetElement._component.unmount();
            targetElement.parentNode.replaceChild(newElement, targetElement);
            targetElement = newElement;
        }
        // provide attributes of regular DOM nodes to the React DevTools
        targetElement.__preactattr_ = sourceElement.attributes;
        // deal with attributes
        const attributeKeys = Object.keys(sourceElement.attributes);
        let skippedAttributes = 0;
        attributeKeys.forEach((attr) => {
            const attribute = sourceElement.attributes[attr];
            // event handling
            if (attr.indexOf('on') === 0 && typeof attribute === 'function') {
                targetElement.removeEventListener(attr.replace(/^on/, '').toLowerCase(), attribute);
                targetElement.addEventListener(attr.replace(/^on/, '').toLowerCase(), attribute);
            } else if (attr === 'dangerouslySetInnerHTML') {
                targetElement.innerHTML = attribute.__html || '';
            } else if (attr === 'ref' && typeof attribute === 'function') {
                attribute(targetElement);
                skippedAttributes += 1;
            } else if (attr === 'style' && typeof attribute === 'object') {
                targetElement[attr] = {};
                Object.assign(targetElement[attr], attribute || {});
            } else if (['value', 'checked', 'selected', 'disabled'].indexOf(attr) >= 0) {
                targetElement[attr] = attribute || '';
                skippedAttributes += 1;
            } else if (targetElement.getAttribute(jsxAttributeMap[attr] || attr) !== attribute) {
                targetElement.setAttribute(jsxAttributeMap[attr] || attr, attribute, 1);
            }
        });
        // remove superfluous attributes
        if (targetElement.attributes.length > attributeKeys.length - skippedAttributes) {
            Array.from(targetElement.attributes).forEach((attr) => {
                if (typeof sourceElement.attributes[attr.name] === 'undefined') {
                    targetElement.removeAttribute(attr.name);
                }
            });
        }

        targetElement.hash = sourceElement.hash;

        // deal with children
        let skipped = 0;
        (sourceElement.children || []).forEach((child, index) => {
            let targetChild = targetElement.childNodes[index - skipped];
            if (!child) {
                skipped += 1;
                return;
            }
            if (!targetChild) {
                targetChild = targetElement.ownerDocument.createElement('div');
                targetElement.appendChild(targetChild);
            }
            applyDiff(targetChild, child, context);
        });
        // remove superfluous children
        while (!sourceElement.attributes.dangerouslySetInnerHTML && (sourceElement.children || []).length - skipped < targetElement.childNodes.length) {
            const child = targetElement.childNodes[targetElement.childNodes.length - 1];
            if (child._component) child._component.unmount();
            child.remove();
        }
    } else if (typeof sourceElement.nodeName === 'function') {
        // deal with sub components
        // existing component
        if (targetElement._component && Object.getPrototypeOf(targetElement._component).constructor === sourceElement.nodeName) {
            const newProps = Object.assign({}, sourceElement.attributes, { children: sourceElement.children });
            targetElement._component.updateProps(newProps);
            return targetElement;
        }

        if (targetElement._component) {
            targetElement._component.unmount();
        }

        // non-existent component
        const ComponentImplementation = sourceElement.nodeName;
        const newProps = Object.assign({}, sourceElement.attributes, { children: sourceElement.children });

        let instance;
        if (ComponentImplementation.prototype && ComponentImplementation.prototype.render) {
            instance = new ComponentImplementation(newProps, context);
        } else {
            instance = new options.baseClass(newProps, context); // eslint-disable-line new-cap
            instance.render = ComponentImplementation.bind(instance);
        }

        instance.mount(targetElement);
    }
    return targetElement;
}

/**
 * Creates a virtual DOM node
 * @param {string|Function} name the name of the tag or it's function
 * @param {Object} attrs attributes as key-value pairs
 * @returns {Object} the virtual DOM node
 */
export function h(name, attrs, ...childList) {
    const children = flattenDeep((childList || []).filter(child => !Array.isArray(child) || child.length > 0));
    const getChildHash = child => (child && typeof child === 'object' ? child.hash : child);
    return {
        nodeName: name,
        attributes: attrs || {},
        children,
        isVNode: true,
        hash: hash([
            name.toString(),
            JSON.stringify(attrs || {}, getCircularReplacer()),
            (children || []).map(getChildHash).join('/'),
        ].join(':')),
    };
}

export class AsyncComponent extends Component {
    getInitialProps() {
        return Promise.resolve(null);
    }

    componentWillMount() {
        this.getInitialProps().then((props) => {
            this.props = Object.assign({}, this.props, props || {});
            this.setState({});
        });
    }
}

export function render(vdom, target) { options.applyVDOM(target, vdom); }
export function rerender() {
    while (dirtyComponents.length > 0) {
        const component = dirtyComponents.shift();
        if (component.base) component.forceUpdate();
    }
}

export function triggerRenderLoop() {
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function frameRequest(now) {
            rerender();
            requestAnimationFrame(frameRequest);
        });
    }
}
triggerRenderLoop();
/* eslint-enable no-underscore-dangle, no-use-before-define */
