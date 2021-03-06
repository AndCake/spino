#!/usr/bin/env -S node --experimental-modules --no-warnings
import * as Spino from './index';
import { renderShallow } from './html-renderer';
import Document from 'nano-dom/src/dom';
import { describe, it, beforeEach, afterEach, expect } from 'chawan';

describe('Component', () => {

    describe('apply vdom', () => {
        let main;

        beforeEach(() => {
            const document = new Document('<html><body><main><div></div></main></body></html>');
            main = document.querySelector('main');
        });
        it('can apply a simple node', () => {
            Spino.render(Spino.h('div', { className: 'test' }, 'Hello World!'), main.firstElementChild);
            expect(main.firstElementChild.classList.contains('test')).toBeTrue();
            expect(main.innerHTML).toInclude('Hello World!');
            expect(main.innerHTML).toEqual('<div class="test">Hello World!</div>');
        });
        it('can apply a vdom node to a DOM text node', () => {
            main.firstElementChild.innerHTML = 'test';
            Spino.render(Spino.h('div', null, Spino.h('p', null, 'test2')), main.firstElementChild);
            expect(main.firstElementChild.childNodes[0].nodeType).toEqual(1);
            expect(main.firstElementChild.childNodes[0].nodeName.toUpperCase()).toEqual('P');
            expect(main.firstElementChild.childNodes[0].innerHTML).toEqual('test2');
        });
        it('can deal with simple vdom trees', () => {
            Spino.render(Spino.h('div', null, [
                'text for starters',
                Spino.h('div', { 'data-name': 'name-value' }, [
                    Spino.h('em', null, 'Lorem ipsum'),
                    Spino.h('strong', null, 'dolor sit amet'),
                ], 'consect etutor'),
                'text for enders',
            ]), main.firstElementChild);
            expect(main.firstElementChild.innerHTML).toEqual('text for starters<div data-name="name-value"><em>Lorem ipsum</em><strong>dolor sit amet</strong>consect etutor</div>text for enders');
        });
        it('can deal with updating existing nodes', () => {
            main.firstElementChild.innerHTML = '<div class="test" name="hello"><p>test</p><q>test2</q></div>';
            Spino.render(Spino.h('div', null, Spino.h('div', { class: 'test', for: 'me' }, [Spino.h('i', null, 'test')])), main.firstElementChild);
            expect(main.firstElementChild.innerHTML).toEqual('<div class="test" for="me"><i>test</i></div>');
        });
        it('can mount sub components', () => {
            let counter = 0;
            class SubComponent extends Spino.Component {
                render() {
                    counter += 1;
                    return Spino.h('div', { class: 'test' }, 'test-text');
                }
            }
            Spino.render(Spino.h('div', null, Spino.h(SubComponent)), main.firstElementChild);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(counter).toEqual(1);
                        expect(main.innerHTML).toEqual('<div><div class="test">test-text</div></div>');
                        resolve();
                    } /* istanbul ignore next */ catch (e) {
                        /* istanbul ignore next */
                        reject(e);
                    }
                }, 0);
            });
        });

        it('can deal with function components', () => {
            let counter = 0;
            /**
             * A functional component without any state
             * @param {Object} props the render props
             * @returns {VDOMNode} The VDOM node to render
             */
            function SubComponent(props) {
                counter += 1;
                return Spino.h('div', { class: 'greeting' }, `Hello, ${props.name}!`);
            }
            Spino.render(Spino.h('div', null, Spino.h(SubComponent, { name: 'Test' })), main.firstElementChild);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(counter).toEqual(1);
                        expect(main.innerHTML).toEqual('<div><div class="greeting">Hello, Test!</div></div>');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            });
        });

        it('keeps the context throughout hierarchies', () => {
            class SubComponent extends Spino.Component {
                render(props, state, context) {
                    expect(context).toEqual(this.context);
                    return Spino.h('div', { class: `context-${context}` }, props.name);
                }
            }
            /**
             * creates a stateless component
             * @return {VDOMNode} a vdom node to be rendered
             */
            function StatelessComponent() {
                return Spino.h('div', { class: 'greeting' }, 'Hello, ', Spino.h(SubComponent, { name: 'Test' }));
            }
            class ContextProvider extends Spino.Component {
                constructor(props, context) {
                    super(props, context);
                    this.context = 'it-is-done';
                }

                render() {
                    return Spino.h('span', null, this.props.children);
                }
            }

            Spino.render(Spino.h('div', null, Spino.h(ContextProvider, null, Spino.h(StatelessComponent, { name: 'Test' }))), main.firstElementChild);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(main.innerHTML).toEqual('<div><span><div class="greeting">Hello, <div class="context-it-is-done">Test</div></div></span></div>');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            });
        });

        it('can update sub components that were already rendered', () => {
            let renderCounter = 0;
            let mountCounter = 0;
            class SubComponent extends Spino.Component {
                render() {
                    renderCounter += 1;
                    return Spino.h('div', { class: 'test' }, `test-${this.props.counter || 0}-text`);
                }

                componentDidMount() {
                    mountCounter += 1;
                }
            }
            Spino.render(Spino.h('div', null, Spino.h(SubComponent, { counter: 0 }, ['test', Spino.h('div', null, 'lorem')])), main.firstElementChild);

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(main.firstElementChild.innerHTML).toEqual('<div class="test">test-0-text</div>');
                        expect(mountCounter).toEqual(1);
                        expect(renderCounter).toEqual(1);
                        Spino.render(Spino.h('div', null, Spino.h(SubComponent, { counter: 1 }, ['test', Spino.h('div', null, 'lorem')])), main.firstElementChild);
                        resolve();
                    } /* istanbul ignore next */ catch (e) {
                        /* istanbul ignore next */
                        reject(e);
                    }
                }, 0);
            }).then(() => {
                expect(mountCounter).toEqual(1);
                expect(renderCounter).toEqual(2);
                expect(main.firstElementChild.innerHTML).toEqual('<div class="test">test-1-text</div>');
            });
        });

        it('can deal with event listeners', () => {
            let counter = 0;
            Spino.render(Spino.h('div', { class: 'to-click', onClick: () => { counter += 1; } }, [null, 'test']), main.firstElementChild);
            main.querySelector('.to-click').click();
            expect(counter).toEqual(1);
        });

        it('can handle dangerouslySetInnerHTML', () => {
            Spino.render(Spino.h('div', { class: 'to-click', dangerouslySetInnerHTML: { __html: '<div class="test">do exist</div>' } }), main.firstElementChild);
            expect(main.querySelector('.test')).toExist();
            expect(main.querySelector('.test').innerHTML).toEqual('do exist');
        });
        it('can handle style attribute objects', () => {
            Spino.render(Spino.h('div', {
                style: {
                    color: 'red',
                    backgroundColor: 'green',
                },
            }), main.firstElementChild);
            expect(main.firstElementChild.style.color).toEqual('red');
            expect(main.firstElementChild.style.backgroundColor).toEqual('green');
        });
        it('can deal with special attributes', () => {
            // for JSDOM somehow the order of attribute definition is important.
            // If type and value are reversed, the resulting value will not be 123 but 'on'
            const input = Spino.h('input', { type: 'radio', value: '123' });
            Spino.render(input, main.firstElementChild);
            expect(main.firstElementChild.value).toEqual('123');
            expect(main.firstElementChild.getAttribute('value')).toEqual('123');
            expect(main.firstElementChild.getAttribute('type')).toEqual('radio');
        });
        it('will unmount sub components when they are removed from the DOM', () => {
            let counter = 0;
            class SubComponent extends Spino.Component {
                componentWillUnmount() {
                    counter += 1;
                }

                render() {
                    return Spino.h('div', { class: 'test' }, 'test-text');
                }
            }
            Spino.render(Spino.h('div', null, Spino.h(SubComponent)), main.firstElementChild);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(counter).toEqual(0);
                        expect(main.querySelector('.test')).toExist();

                        Spino.render(Spino.h('div'), main.firstElementChild);
                        expect(counter).toEqual(1);
                        expect(main.querySelector('.test')).toNotExist();
                        resolve();
                    } /* istanbul ignore next */catch (e) {
                        /* istanbul ignore next */
                        reject(e);
                    }
                }, 0);
            });
        });
        it('will provide DOM nodes as VDOM clones when accessing props.children', () => {
            class Component extends Spino.Component {
                render(props) {
                    return Spino.h('div', null, Spino.h('p', null, 'huhu!'), props.children);
                }
            }
            main.firstElementChild.innerHTML = 'lorem <div class="test">ipsum</div> dolor';
            const vnode = Spino.h(Component, null, Array.from(main.firstElementChild.childNodes));
            main.firstElementChild.innerHTML = '';
            Spino.render(vnode, main.firstElementChild);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(main.firstElementChild.firstElementChild.nodeName.toLowerCase()).toEqual('p');
                        expect(main.firstElementChild.childNodes[0].innerHTML).toEqual('huhu!');
                        expect(main.firstElementChild.childNodes[1].nodeValue, 'has used provided text node').toEqual('lorem ');
                        expect(main.firstElementChild.childNodes[2].nodeName.toLowerCase(), 'has used provided div').toEqual('div');
                        expect(main.firstElementChild.childNodes[2].classList.contains('test'), 'provided div contains proper classes').toBeTrue();
                        expect(main.firstElementChild.childNodes[3].nodeValue, 'has used provided end text node').toEqual(' dolor');
                        resolve();
                    } /* istanbul ignore next */catch (e) {
                        /* istanbul ignore next */
                        reject(e);
                    }
                }, 0);
            });
        });

        it('allows for usage of ref', () => {
            const document = new Document('<html><body><div></div></body></html>');
            let reference = undefined;
            class X extends Spino.Component {
                myRef(ref) {
                    reference = ref;
                }
                render() {
                    return Spino.h('div', {ref: this.myRef}, 'hello world!');
                }
            }
            new X({}).mount(document.body);
            expect(reference).toExist();
            expect(reference.innerHTML).toEqual('hello world!');
            expect(reference.querySelector).toBeA('function');
        });
    });

    describe('nesting', () => {
        const originalOptions = {};
        let renderResult = '';

        beforeEach(() => {
            originalOptions.applyVDOM = Spino.options.applyVDOM;
            Spino.options.applyVDOM = (target, source) => {
                renderResult = renderShallow(source, Spino.options);
                return {};
            };
        });

        afterEach(() => {
            renderResult = '';
            Spino.options.applyVDOM = originalOptions.applyVDOM;
        });
        it('calls render during mount', () => {
            let counter = 0;
            class X extends Spino.Component {
                render() {
                    counter += 1;
                    return '';
                }
            }
            new X({}).mount({});
            expect(counter, 'render called').toEqual(1);
        });

        it('calls componentDidMount after DOM insertion', () => {
            let counter = 0;
            class X extends Spino.Component {
                componentDidMount() {
                    counter += 1;
                    expect(renderResult).toNotBeEmpty();
                }
            }

            new X({}).mount({});
            expect(counter, 'component mounted').toEqual(1);
        });

        it('calls shouldUpdateComponent before rendering', () => {
            let counter = 0;
            class X extends Spino.Component {
                shouldComponentUpdate(newProps, newState) {
                    if (counter) {
                        expect(newProps).toDeepEqual(this.props);
                        expect(newState).toDeepEqual({ x: 123 });
                    }

                    counter += 1;

                    return newProps.runUpdate;
                }
            }
            const x = new X({ runUpdate: false });
            x.mount({});
            renderResult = '';
            x.setState({ x: 123 });
            expect(counter).toEqual(2);
            expect(renderResult).toBeEmpty();

            x.updateProps({ runUpdate: true });
            expect(counter).toEqual(3);
            expect(renderResult).toNotBeEmpty();
        });

        it('calls componentDidUpdate after rendering', () => {
            let counter = 0;
            class X extends Spino.Component {
                componentDidUpdate() {
                    counter += 1;
                }
            }
            const x = new X();
            x.mount({});

            expect(counter).toEqual(0);
            x.setState({ test: 123 });
            expect(counter).toEqual(1);
            x.updateProps({ runUpdate: true });
            expect(counter).toEqual(2);
        });

        it('calls componentDidCatch if an error occurs during rendering', () => {
            let counter = 0;
            //* eslint-disable react/require-render-return * /
            class X extends Spino.Component {
                componentDidCatch(error) {
                    counter += 1;
                    expect(error.message).toEqual('render error');
                }

                render() {
                    throw new Error('render error');
                }
            }
            //* eslint-enable react/require-render-return * /
            new X({}).mount({});
            expect(counter).toEqual(1);

            class Y extends Spino.Component {
                render() {
                    throw new Error('Another render error');
                }
            }
            expect(() => {
                new Y({}).mount({});
            }).toThrow('Another render error');
        });

        it('calls componentWillUnmount on sub components when rendering changes', () => {
            Spino.options.applyVDOM = originalOptions.applyVDOM;
            const document = new Document('<html><body><div></div></body></html>');
            let counter = 0;

            class X extends Spino.Component {
                componentWillUnmount() {
                    super.componentWillUnmount();
                    counter += 1;
                }

                render() {
                    return Spino.h('li', {});
                }
            }

            class XParent extends Spino.Component {
                constructor(props) {
                    super(props);
                    this.state = {
                        withX: true,
                    };
                }

                render() {
                    let content;
                    if (this.state.withX) {
                        content = Spino.h(X, {});
                    } else {
                        content = Spino.h('div', {});
                    }
                    return Spino.h('div', { className: 'test' }, content);
                }
            }

            const xParent = new XParent({});
            xParent.mount(document.body.querySelector('div'));

            expect(document.querySelector('li')).toExist();
            xParent.setState({ withX: false });
            expect(document.querySelector('li')).toNotExist();
            expect(counter).toEqual(1);
        });
    });

    describe('Async components', () => {
        it('can work with the default props', () => {
            const document = new Document('<html><body><div></div></body></html>');
            class MyComponent extends Spino.AsyncComponent {
                render(props) {
                    this.counter = (this.counter || 0) + 1;
                    return Spino.h('em', {}, this.counter);
                }
            }
            const myComponent = new MyComponent();
            myComponent.mount(document.body);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(document.querySelector('em').innerHTML).toEqual('2');
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }, 10);
            });
        });
        it('can load the props asynchronously', () => {
            const document = new Document('<html><body><div></div></body></html>');
            class MyComponent extends Spino.AsyncComponent {
                getInitialProps() {
                    return Promise.resolve({
                        value: 123
                    })
                }

                render(props) {
                    return Spino.h('em', {}, props.value);
                }
            }
            const myComponent = new MyComponent();
            myComponent.mount(document.body);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(document.querySelector('em').innerHTML).toEqual('123');
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }, 10);
            });
        });
    });

    describe('works in browser environment', () => {
        let ends = false;
        beforeEach(() => {
            global.requestAnimationFrame = function requestAnimationFrame(fn) {
                if (ends === true) return;
                setTimeout(fn, 1);
            };
            Spino.triggerRenderLoop();
        });
        afterEach(() => {
            ends = true;
        });
        it('updates a component only once', () => {
            let counter = 0;
            const document = new Document('<html><body><div></div></body></html>');
            class TestComponent extends Spino.Component {
                constructor(props) {
                    super(props);
                    this.state = {
                        value: 0,
                    };
                }
                render(props, state) {
                    counter += 1;
                    return Spino.h('div', {}, state.value);
                }
            }
            const testComponent = new TestComponent({});
            testComponent.mount(document.querySelector('div'));
            expect(counter).toEqual(1);
            expect(testComponent.state.value).toEqual(0);
            testComponent.setState({value: 1});
            testComponent.setState({value: 2});

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        expect(counter).toEqual(2);
                        expect(testComponent.state.value).toEqual(2);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }, 100);
            });
        });
    });
});
