/**
 * Get a well-formed host to match against from a URL user- or code-supplied
 * @param {string} text A URL-like value (eg `ftp://example.com/file/path/etc`, `google.com/`)
 * @returns {string} Well formatted host portion of url (eg `example.com`, `google.com`)
 * 
 * @throws Parsing an invalid URL
 */
export function extractURLHost(text) {
    let url = text + ""; // cast to string (is this needed?)

    // We don't actually care about the protocol as we only compare url.host
    // But the URL object will fail to create if no protocol is provided
    if (!url.startsWith("http")) {
        url = "https://" + url;
    }
    const newUrl = new URL(url);
    return newUrl.host;
}

/**
 * Object-specific empty check
 * @param {Object} object
 * @returns {boolean} 
 */
export function isObjectEmpty(object) {
    return Object.keys(object).length === 0;
}

/**
 * Check if a value is "empty".
 * 
 * `0` and `false` *aren't* considered empty.
 * 
 * Nullish values, empty strings, and empty `Set`s are considered empty.
 * @param {any} value 
 * @returns {boolean} 
 */
export function isEmptyValue(value) {
    // Sets seem empty when treated as objects
    if(value instanceof Set && value.size !== 0) return false;

    // Main check
    return (
        (value === undefined) ||
        (value === null) ||
        (value === "") ||
        (typeof value === "object" && isObjectEmpty(value)) // Also catches empty arrays and Sets
    );
}
