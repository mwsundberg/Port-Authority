import { isEmptyValue, isObjectEmpty } from "./utils.js";

/**
 * Slightly fancier `document.createElement` that accepts attributes and children
 * 
 * Note if both "className" and "class" are provided only the later-in-the-object value will be used, without warning:
 * @example
 * createElement("div", {class: ["one", "two"], className: "three"});
 * // Results in `<div class="three"></div>`
 * 
 * No whitespace is inserted between children:
 * @example
 * createElement("span", {}, ["no", "spaces"]);
 * // Results in `<span>nospaces</span>`
 * 
 * @param {string} tag The HTML tag to use
 * @param {Record<string, string|string[]>} [props] Attributes to set on the element. Classes can be passed in either `className` or `class`. Arrays will be space separated
 * @param {string|Node|Node[]} [contents] Both `Element`s and strings supported. Using type `Node` to also accept text nodes made with `createTextNode`
 * @returns {HTMLElement} A standard `Element` instance
 */
export function createElement(tag, props, contents) {
    const el = document.createElement(tag);

    // Attributes, if provided
    if(props && !isObjectEmpty(props)) {
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
 * @template T Specifies the array contents' type
 * @typedef {Object} RenderArrayFactoryArgs
 * @property {Element} destination Where to insert the HTML representation of the data
 * @property {Element} [wrapper=destination] Other HTML that should be conditionally hidden if `fetchData()` returns nothing. Defaults to `destination`
 * @property {()=>(Array<T>|Promise<Array<T>>)} fetchData A function that returns an array to render. `async` accepted too
 * @property {(item: T)=>(Node|string)} [renderItem=(item)=>item.toString()] How to render a single item of the data array. Defaults to calling `.toString()`
 */
/**
 * Constructs a render function for rendering data in array format to HTML. If passed `destination` or `wrapper` elements already in the document will update the values there
 * @template T Specifies the array contents' type
 * @param {RenderArrayFactoryArgs<T>} args Arguments passed via object notation for clarity and ordering convenience. See {@linkcode RenderArrayFactoryArgs} for specifics
 * @returns {()=>Promise<void>} A function that will render the provided data to HTML
 */
export function renderArrayFactory({
    destination,
    wrapper = destination,
    fetchData,
    // @ts-ignore (`.toString()` complaining)
    renderItem = (item) => item.toString()
}) {
    return async () => {
        // Clear stale contents
        destination.replaceChildren();

        // Fetch the data to render
        const data = await fetchData();

        // Early return, hiding wrapper if data is empty
        if (data.length === 0) {
            wrapper.classList.add("unpopulated");
            return;
        }

        // Populate the data container in DOM
        for (const d of data) {
            destination.append(
                renderItem(d)
            );
        }

        // Toggle visibility on the container wrapper after populating the data
        wrapper.classList.remove("unpopulated");
    };
}

/**
 * Arguments type for {@linkcode renderObjectFactory}
 * @template {string | number | symbol} K The object-to-render's key types
 * @template V The object-to-render's value types
 * @typedef {Object} RenderObjectFactoryArgs
 * @property {Element} destination Where to insert the HTML representation of the data
 * @property {Element} [wrapper=destination] Other HTML that should be conditionally hidden if `fetchData()` returns nothing. Defaults to `destination`
 * @property {()=>(Record<K, V>|Promise<Record<K, V>>)} fetchData A function that returns data to render in object form. `async` accepted too
 * @property {(key: K, value: V)=>(Node|string)} [renderItem=(key, value)=>(key.toString() + " " + value.toString())] How to render a single item of the data array. Defaults to calling `.toString()`
 */
/**
 * Constructs a render function for rendering data in `Object` format to HTML. If passed `destination` or `wrapper` elements already in the document will update the values there
 * @template {string | number | symbol} K The object-to-render's key type
 * @template V The object-to-render's value type
 * @param {RenderObjectFactoryArgs<K, V>} args Arguments passed via object notation for clarity and ordering convenience. See {@linkcode RenderObjectFactoryArgs} for specifics
 * @returns {()=>Promise<void>} A function that will render the provided data to HTML
 */
export function renderObjectFactory({
    destination,
    wrapper = destination,
    fetchData,
    // @ts-ignore (`.toString()` complaining)
    renderItem = (key, value) => (key.toString() + " " + value.toString())
}) {
    return async () => {
        // Clear stale contents
        destination.replaceChildren();

        // Fetch the data to render
        const data = await fetchData();

        // Early return, hiding wrapper if data is empty
        if (isObjectEmpty(data)) {
            wrapper.classList.add("unpopulated");
            return;
        }

        // Populate the data container in DOM
        for (const key in data) {
            // Using `.append` to also accept strings
            destination.append(
                renderItem(key, data[key])
            );
        }

        // Toggle visibility on the container wrapper after populating the data
        wrapper.classList.remove("unpopulated");
    };
}
