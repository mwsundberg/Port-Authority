import { isObjectEmpty } from "./utils.js";

/**
 * Slightly fancier `document.createElement` that accepts attributes and children
 * 
 * 
 * @example
 * createElement("button", {class: ["unselectable", "align-right"], "aria-label": "Remove domain"}, ["✕ ", createElement("span", {}, "Remove")]);
 *     // Result: `<button class="unselectable align-right" aria-label="Remove domain">✕ <span>Remove</span></button>`
 * 
 * @example
 * // Note if both "className" and "class" are provided only the later-in-the-object value will be used, without warning:
 * createElement("div", {class: ["one", "two"], className: "three"});
 *     // Result: `<div class="three"></div>`
 * 
 * @example
 * // No whitespace is inserted between children:
 * createElement("span", {}, ["no", "spaces"]);
 *     // Result: `<span>nospaces</span>`
 * @param {string} tag The HTML tag to use
 * @param {Record<string, string|string[]>} [props] Attributes to set on the element. Classes can be passed in either `className` or `class`. Arrays will be space separated
 * @param {(Node|string) | (Node|string)[]} [contents] Both `Element`s and strings supported. Using type `Node` to also accept text nodes made with `createTextNode`
 * @returns {HTMLElement} A standard `Element` instance
 */
export function createElement(tag, props, contents) {
    const el = document.createElement(tag);

    // Attributes, if provided
    if(props) {
        for(let p in props) {
            // Value stringification
            let value = props[p];
            if(Array.isArray(value)) value = value.join(' ');

            // "className" exception
            if(p === "className") p = "class";

            el.setAttribute(p, value);
        }
    }

    // Contents, if provided
    if(contents) {
        // Prevent strings from being split by the spread operator
        const contentsArray = Array.isArray(contents)? contents : [contents];
        el.replaceChildren(...contentsArray);
    }

    return el;
}

/**
 * Arguments type for {@linkcode renderArrayFactory}
 * @template T Specifies the array content's type
 * @typedef {Object} RenderArrayFactoryArgs
 * @property {Element} destination Where to insert the HTML representation of the data
 * @property {Element} [wrapper] Other HTML that should be conditionally hidden if `fetchData()` returns nothing. Defaults to `destination`
 * @property {()=>(Array<T> | Promise<Array<T>> | undefined)} fetchData A function that returns an array to render. `async` accepted too
 * @property {(value: T, index?: number)=>((Node|string) | (Node|string)[])} [renderItem] How to render a single item of the data array. Defaults to "{value} ", discarding `index`
 */
/**
 * Constructs a function that renders an array returned by {@linkcode fetchData} to HTML and inserts it into the `Element` passed in {@linkcode destination}. Since all JS arrays are objects under the hood (`['a','b','c']` = `{0: 'a', 1: 'b', 2: 'c'}`) this is a thin wrapper around {@linkcode renderObjectFactory}.
 * @template T Specifies the array content's type
 * @param {RenderArrayFactoryArgs<T>} args Arguments passed with object notation for clarity and ordering convenience. See {@linkcode RenderArrayFactoryArgs} for specifics
 * @returns {()=>Promise<void>} A function that will render the provided data to HTML
 */
export function renderArrayFactory({
    destination,
    wrapper = destination,
    fetchData,
    renderItem = (value) => `${String(value)} ` // `String()` called to accept Symbols without throwing an error: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String#using_string_to_stringify_a_symbol
}) {
    return renderObjectFactory({
        destination,
        wrapper,
        fetchData,
        // Arrays treated as Objects are iterated in `renderObjectFactory` like `(i, array[i])`, so need to flip the argument order
        renderItem: (index, value) => renderItem(value, index)
    });
}

/**
 * Arguments type for {@linkcode renderObjectFactory}
 * @template {keyof any} K The object-to-render's key types (matching what TypeScript `Record` uses)
 * @template V The object-to-render's value type
 * @typedef {Object} RenderObjectFactoryArgs
 * @property {Element} destination Where to insert the HTML representation of the data
 * @property {Element} [wrapper] Other HTML that should be conditionally hidden if `fetchData()` returns nothing. Defaults to `destination`
 * @property {()=>(Record<K, V> | Promise<Record<K, V>> | undefined)} fetchData A function that returns data to render in {key: value, ...} format. `async` accepted too
 * @property {(key: K, value: V)=>((Node|string) | (Node|string)[])} [renderItem] How to render a single key-value pair. Defaults to "{k}: {v} "
 */
/**
 * Constructs a function that renders an object's key-value pairs to HTML and inserts them into the `Element` passed in {@linkcode destination}.
 * @template {keyof any} K The object-to-render's keys type
 * @template V The object-to-render's values type
 * @param {RenderObjectFactoryArgs<K, V>} args Arguments passed with object notation for clarity and ordering convenience. See {@linkcode RenderObjectFactoryArgs} for specifics
 * @returns {()=>Promise<void>} A function that will render the provided data to HTML
 */
export function renderObjectFactory({
    destination,
    wrapper = destination,
    fetchData,
    renderItem = (key, value) => `${String(key)}: ${String(value)} ` // `String()` called to accept Symbols without throwing an error: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String#using_string_to_stringify_a_symbol
}) {
    return async () => {
        // Clear stale contents
        destination.replaceChildren();

        // Fetch the data to render
        const data = await fetchData();

        // Early return, hiding wrapper if data is empty
        if (isObjectEmpty(data)) {
            wrapper.setAttribute("hidden", "");
            return;
        }

        // Populate the data container in DOM
        for (const key in data) {
            const rendered = renderItem(key, data[key]);
            // Prevent strings from being split by the spread operator
            const renderedArray = Array.isArray(rendered)? rendered : [rendered];

            // Using `.append` to also accept strings
            destination.append(...renderedArray);
        }

        // Toggle visibility on the container wrapper after populating the data
        wrapper.removeAttribute("hidden");
    };
}
