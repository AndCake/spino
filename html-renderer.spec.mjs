import * as Preact from './index';
import { render, renderShallow } from './html-renderer';
import { describe, it, expect } from './test/test-runner';

describe('HTML Renderer', () => {
    it('can render simple vdom trees', () => {
        let vdom = Preact.h('div', { class: 'test' }, 'my content');
        let result = renderShallow(vdom, Preact.options);
        expect(result).toEqual('<div class="test">my content</div>');

        vdom = Preact.h('div', null, Preact.h('p', null, 'Lorem ipsum', Preact.h('a', { href: '#' }, 'click me')), 'dolor sit amet');
        result = render(vdom, Preact.options);
        expect(result).toEqual('<div><p>Lorem ipsum<a href="#">click me</a></p>dolor sit amet</div>');

        vdom = Preact.h('div', null, Preact.h('p', null, 'Lorem ipsum', Preact.h('a', { href: '#' }, 'click me')), 'dolor sit amet');
        result = renderShallow(vdom, Preact.options);
        expect(result).toEqual('<div><p>Lorem ipsum<a href="#">click me</a></p>dolor sit amet</div>');
    });

    it('can render vdom trees with components', () => {
        class X extends Preact.Component {
            render() {
                return Preact.h('p', { class: this.props.data }, `lorem ${this.props.children} ipsum`);
            }
        }
        const vdom = Preact.h('div', null, Preact.h(X, { data: 1234 }, 'test'));
        const result = render(vdom, Preact.options);

        expect(result).toEqual('<div><p class="1234">lorem test ipsum</p></div>');
    });

    it('can shallowly render vdom trees with components', () => {
        class X extends Preact.Component {
            render() {
                return Preact.h('p', { class: this.props.data }, `lorem ${this.props.children} ipsum`);
            }
        }
        const vdom = Preact.h('div', null, Preact.h(X, { data: 1234 }, 'test'));
        const result = renderShallow(vdom, Preact.options);
        expect(result).toEqual('<div><X data="1234">test</X></div>');
    });

    it('can render vdom trees with contextualized components', () => {
        class ContextProvider extends Preact.Component {
            constructor(props, context) {
                super(props, context);
                this.context = 'my-new-context';
            }

            render() {
                return Preact.h('h2', null, this.props.children);
            }
        }
        /**
         * consumes a given context
         * @return {VDOMNode} Generates a rendered vdom
         */
        function contextConsumer() {
            return Preact.h('h3', null, this.context);
        }
        const result = render(Preact.h('div', null, Preact.h(ContextProvider, null, Preact.h(contextConsumer))), Preact.options);
        expect(result).toEqual('<div><h2><h3>my-new-context</h3></h2></div>');
    });
});
