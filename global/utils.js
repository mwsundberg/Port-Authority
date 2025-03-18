/**
 * Object-specific empty check
 * @param {Object} object
 * @returns {boolean} 
 */
export function isObjectEmpty(object) {
    return object === undefined || object === null || Object.keys(object).length === 0;
}