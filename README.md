# Spino

A simple and fast component library written in ES6 and meant for direct execution as an ES module in browsers. It is compatible to Preact's API but is smaller and requires a smaller memory footprint while being similarily fast.

Installation
------------

If you want to use it in conjunction with some bundler, you can install it as a regular node module:

```
$ npm i spino
```

or alternatively using it in your scripts directly from unpkg, provided you aren't using an ES6 bundler such as webpack or rollup:

```js
import * as Spino from 'https://unkpg.com/spino';

export default class MyComponent from Spino.Component {
    // ...
}
```

Using such a module inside your HTML you can do:

```html
<div id="my-component"></div>
<script type="module">
    import MyComponent from './my-component.mjs';

    const props = {
        name: 'World',
    };

    new MyComponent(props).mount(document.getElementById('my-component'));
</script>
```

Core API
--------

The module exports the following properties / functions / classes:

### class Component

Your components can inherit directly from it in order to implement themselves.

**Example:**

```js
/** @jsx Spino.h */
import * as Spino from 'spino';

export default class FirstComponent extends Spino.Component {
    render(props, state) {
        return (
            <em>
                Hello world!
            </em>
        );
    }
}
```

Every component based on this class can be mounted into the DOM using the `mount(targetElement : DOMElement)` method.

**Example:**

```js
import FirstComponent from './first-component.mjs';

new FirstComponent().mount(document.querySelector('[data-module="first-component"]'));
```

### class AsyncComponent extends Component

If your components need to retrieve their props asynchronously during their execution, then you can use `AsyncComponent` instead of `Component`.

**Example:**

```js
/** @jsx Spino.h */
import * as Spino from 'spino';

export default class SecondComponent extends Spino.AsyncComponent {
    // this function is called before it is mounted in the DOM
    getInitialProps() {
        // do some asynchronous call to the backend
        return fetch('/data.json').then(response => response.json()).then(data => ({
            title: data.name,
            content: data.description,
        }));
    }

    render(props) {
        return (
            <dl class="second-component">
                <dt>{props.title}</dt>
                <dd>{props.content}</dd>
            </dl>
        );
    }
}
```

### options

The following options can be used:

`options.applyVDOM(target : DOMElement, sourceElement : VDOMNode, context : Object) : DOMElement`

- Allows for replacing the regular rendering algorithm of a component into the DOM - helpful for testing or to do server-side rendering

`options.baseClass`

- this defines what the default base-class should be for components. It defaults to Spino.Component

`options.afterMount(self : Component)`

- if you set this function, you will be notified whenever a component mounted itself into the DOM.

`options.afterUpdate(self : Component)`

- this will notify you whenever a component finished updating itself. This is called before the component's own componentDidUpdate() lifecycle function

`options.beforeUnmount(self : Component)`

- setting this function will notify you whenever a component is about to be unmounted from the DOM.

### h(name : String, attrs : Object, ...children)

This is the equivalent of Preact's h function or React's createElement function. It will generate a VDOM which can subsequently be rendered using the Component's render function or by directly calling `render(vdom : VDOMNode, target : DOMElement)`.

In order to use Spino with a transpiler to convert your JSX into regular Javascript, you can set the Babel pragma to Spino.h . Alternatively, you can also use tagged templates such as from [template2jsx](http://npmjs.com/package/template2jsx) as to avoid having to transpile your Javascript.

### render(vdom : VDOMNode, target : DOMElement)

Renders a (functional) component or a VDOM tree.

**Example:**

```js
/** @jsx Spino.h */
import * as Spino from 'spino';
import AppCore from './app-core';

function App(props) {
    return (
        <div class="my-app">
            <AppCore url={props.url}/>
        </div>
    );
}

Spino.render(App({ url: 'https://www.google.com/' }), document.body);
```

### rerender()

Re-renders all components that require an update at this moment in time. This function is specifically helpful for test environments since in a regular browser, the `rerender()` function is called for every rendered frame.

HTML Renderer
-------------

Spino comes with an HTML renderer so that server-side rendering (or rendering inside tests) becomes easier and you don't need to import a separate package for it. This module provides two functions:

### render(vdom : VDOMNode[, options : Object[, context : Object]]) : String

renders the given VDOM tree and returns a string of the rendered result.

**Example:**

```js
/** @jsx Spino.h */
import MyComponent from './my-component';
import * as Spino from 'spino';
import { render } from 'spino/html-renderer.mjs';

renderResult = render(<MyComponent name="World"/>);

console.log(renderResult);
```

### renderShallow(vdom : VDOMNode) : String

renders the given VDOM node in such a way that sub components will be kept as is - without rendering them as well. This is very useful for testing purposes, where you only want to render the actual component in order to unit-test it.

**Example:**

```js
/** @jsx Spino.h */
import * as Spino from 'spino';
import ListItem from './list-item';
import { renderShallow } from 'spino/html-renderer.mjs';

class List extends Spino.Component {
    render(props) {
        return (
            <ul>
                {props.items.map(item => (
                    <li><ListItem value={item}/></li>
                ))}
            </ul>
        );
    }
}

const renderResult = renderShallow(<List items={[1, 2, 3]}/>);

console.log(renderResult); // === '<ul><li><ListItem value="1"></li><li><ListItem value="2"/></li><li><ListItem value="3"/></li></ul>'
```

License
=======

[MIT](https://choosealicense.com/licenses/mit/)
