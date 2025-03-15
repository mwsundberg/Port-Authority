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
 * @template T
 * @overload
 * @param {Element} dataContainerElement
 * @param {()=>Array<T>} dataFetcher A function that returns an array to render
 * @param {(arrayVal: T)=>Node} dataRenderer How to render an item of the data returned
 * @param {Element} [wrapperElement]
 * @returns {()=>Promise<void>}
 */
/**
 * @template T
 * @overload
 * @param {Element} dataContainerElement
 * @param {()=>Record<string, T>} dataFetcher A function that returns an object to render
 * @param {(key: string, value: T)=>Node} dataRenderer How to render a key-value pair of the data returned
 * @param {Element} [wrapperElement]
 * @returns {()=>Promise<void>}
 */
/**
 * @overload
 * @param {Element} dataContainerElement
 * @param {()=>any} dataFetcher A function that returns the data to render 
 * @param {(stringifyable: any)=>Node} [dataRenderer] How to render the data. Optional, will insert `toString()`'s results if not provided
 * @param {Element} [wrapperElement]
 * @returns {()=>Promise<void>}
 */
/**
 * @template T
 * @param {Element} dataContainerElement Where to insert the HTML representation of the data
 * @param {(()=>Array<T>) | (()=>Record<string, T>) | (()=>any)} dataFetcher A function that returns the data to render, accepting either an array, object, or `.toString()` compatible value
 * @param {((arrayVal: T)=>Node) | ((key: string, value: T)=>Node) | ((stringifyable: any)=>Node)} [dataRenderer] How to render the data, single items if passed an array or object. Optional, will insert `toString()`'s results if not provided
 * @param {Element} [wrapperElement] Other HTML that should be conditionally hidden if `dataFetcher` returns nothing. If not provided defaults to `dataContainerElement`
 * @returns {()=>Promise<void>} Returns an `async` function to allow for parallel execution (except not really since JS is single-threaded)
 */
export function updateDataDisplayFactory(
    dataContainerElement,
    dataFetcher,
    dataRenderer = (...data) => document.createTextNode(data.toString()),
    wrapperElement = dataContainerElement) {
    // TODO Improve type narrowing and `@overload` handling, currently have several type errors when checking with `ts-check`
    return async () => {
        // Clear stale contents
        dataContainerElement.replaceChildren();

        // Fetch the data and identify its type
        const data = dataFetcher();
        const dataType = Array.isArray(data) ? 'array' : typeof data;

        // Populate the data container in DOM
        if (dataType === "array") {
            // Early return, hiding wrapper if data is empty
            if (data.length === 0) {
                wrapperElement.classList.add("unpopulated");
                return;
            }
            
            for (const item of data) {
                dataContainerElement.append(
                    dataRenderer(item)
                );
            }
        } else if (dataType === "object") {
            // Early return, hiding wrapper if data is empty
            if(isObjectEmpty(data)) {
                wrapperElement.classList.add("unpopulated");
                return;
            }

            for (const key in data) {
                dataContainerElement.append(
                    dataRenderer(key, data[key])
                );
            }
        } else {
            // Early return, hiding wrapper if data is empty
            if(isEmptyValue(data)) {
                wrapperElement.classList.add("unpopulated");
                return;
            }

            dataContainerElement.append(dataRenderer(data));
        }

        // Toggle visibility on the container wrapper after populating the data
        wrapperElement.classList.remove("unpopulated");
    };
}
