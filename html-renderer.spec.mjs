import * as Spino from './index';
import { render, renderShallow } from './html-renderer';
import { describe, it, expect } from 'chawan';

describe('HTML Renderer', () => {
    it('can render a string', () => {
        expect(render(false)).toEqual(false);
        expect(render('test')).toEqual('test');
    });
    it('can render simple vdom trees', () => {
        let vdom = Spino.h('div', { class: 'test' }, 'my content');
        let result = renderShallow(vdom, Spino.options);
        expect(result).toEqual('<div class="test">my content</div>');

        vdom = Spino.h('div', null, Spino.h('p', null, 'Lorem ipsum', Spino.h('a', { href: '#' }, 'click me')), 'dolor sit amet');
        result = render(vdom, Spino.options);
        expect(result).toEqual('<div><p>Lorem ipsum<a href="#">click me</a></p>dolor sit amet</div>');

        vdom = Spino.h('div', null, Spino.h('p', null, 'Lorem ipsum', Spino.h('a', { href: '#' }, 'click me')), 'dolor sit amet');
        result = renderShallow(vdom, Spino.options);
        expect(result).toEqual('<div><p>Lorem ipsum<a href="#">click me</a></p>dolor sit amet</div>');
    });

    it('can render vdom trees with components', () => {
        class X extends Spino.Component {
            render() {
                return Spino.h('p', { class: this.props.data }, `lorem ${this.props.children} ipsum`);
            }
        }
        const vdom = Spino.h('div', null, Spino.h(X, { data: 1234 }, 'test'));
        const result = render(vdom, Spino.options);

        expect(result).toEqual('<div><p class="1234">lorem test ipsum</p></div>');
    });

    it('can shallowly render vdom trees with components', () => {
        class X extends Spino.Component {
            render() {
                return Spino.h('p', { class: this.props.data }, `lorem ${this.props.children} ipsum`);
            }
        }
        const vdom = Spino.h('div', null, Spino.h(X, { data: 1234 }, 'test'));
        const result = renderShallow(vdom, Spino.options);
        expect(result).toEqual('<div><X data="1234">test</X></div>');
    });

    it('can deal with shallowly rendered components if they\'re anonymous', () => {
        const actual = renderShallow(Spino.h(() => Spino.h('div', {}, 'test')), Spino.options);
        expect(actual).toEqual('<UnknownComponent></UnknownComponent>');
    });

    it('can render vdom trees with contextualized components', () => {
        class ContextProvider extends Spino.Component {
            constructor(props, context) {
                super(props, context);
                this.context = 'my-new-context';
            }

            render() {
                return Spino.h('h2', null, this.props.children);
            }
        }
        /**
         * consumes a given context
         * @return {VDOMNode} Generates a rendered vdom
         */
        function contextConsumer() {
            return Spino.h('h3', null, this.context);
        }
        const result = render(Spino.h('div', null, Spino.h(ContextProvider, null, Spino.h(contextConsumer))), Spino.options);
        expect(result).toEqual('<div><h2><h3>my-new-context</h3></h2></div>');
    });
});
