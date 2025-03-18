import { getItemFromLocal } from "../global/BrowserStorageManager.js";
import { isObjectEmpty } from "../global/utils.js";
import { getActiveTabId } from "../global/browserActions.js";
import { createElement, renderArrayFactory, renderObjectFactory } from "../global/domUtils.js";

/**
 * **A row in the popup display for "Blocked Port Scans"**
 * 
 * Has a side-effect of pluralizing "Ports" in the table header if multiple ports on the same hostname encountered
 * @param {string} host The LAN hostname/IP that was accessed
 * @param {string[]} ports Which port(s) were scanned. Still handled properly if no ports are provided, yet bad practice
 * @returns {Element} A table row with one of the following structures
 * 
 * 
 * **Multiple ports on the same hostname:**
 * 
 * *Note that the expansion/collapsing of the ports list is handled purely in CSS, using logic similar to `switchButton.css`.*
 * ```html
 * <tr>
 *     <td class="host-cell">{host}</td>
 *     <td class="ports-cell">
 *         <span class="many-ports">
 *             <label class="ports-expansion-toggle" aria-label="Toggle ports list expansion">
 *                 <input type="checkbox">
 *                 <!-- `::after=➕︎/➖︎` -->
 *             </label>
*              <span class="ports-expansion-target">
*                  <span class="port">{ports[0]}</span><!-- whitespace -->
*                  <span class="port">{ports[1]}</span><!-- whitespace -->
*                  <span class="port">{...}</span><!-- whitespace, simpler to add than exclude -->
*              </span>
           </span>
 *     </td>
 * </tr>
 * ```
 * 
 * **One port:**
 * ```html
 * <tr>
 *     <td class="host-cell">{host}</td>
 *     <td class="ports-cell port">
 *         {ports[0]}
 *     </td>
 * </tr>
 * ```
 * 
 * **No ports provided (will `console.warn` too):**
 * ```html
 * <tr>
 *     <td class="host-cell">{host}</td>
 *     <!-- No `<td>` for the ports, intentionally -->
 * </tr>
 * ```
 */
function buildBlockedPortsRow(host, ports) {
    const row = document.createElement("tr");

    // Table cell for hostname: `<td class="host-cell">{host}</td>`
    const hostCell = createElement("td", {class: "host-cell"}, host);
    row.appendChild(hostCell);

    // No ports case: return early and warn
    if (ports.length === 0) {
        console.warn("No port supplied when rendering blocked portscans for '" + host + "'");

        return row;
    }

    /****Table cell for ports:** `<td class="ports-cell">` */
    const portsCell = createElement("td", {class: "ports-cell"});
    row.appendChild(portsCell);

    // One port: `<td class="ports-cell port">{port}</td>`
    if (ports.length === 1) {
        portsCell.classList.add("port");
        portsCell.innerText = ports[0];

        return row;
    }

    //////// Multiple ports: see JSDoc for full structure
    // Side-effect: pluralize the ports header
    document.querySelector("#blocked-ports .ports-header-cell").innerText = "Ports";
    // Good to have low-number privileged ports first
    ports.sort();
    
    /****Wrapper element:** `<span class="many-ports">`
     * Needed since styling `<td>`s with `display` sometimes breaks accessiblity: ({@link https://developer.mozilla.org/en-US/docs/Web/CSS/display#tables | MDN citation}).
     * Using a span since a `<div>` having `display: block;` messes up the formatting on copied text. */
    const manyPorts = createElement("span", {class: "many-ports"});
    portsCell.appendChild(manyPorts);

    /****Expansion toggle:** `<label class="ports-expansion-toggle" aria-label="Toggle ports list expansion"><input type="checkbox">{::after=➕︎/➖︎}</label>`
     * 
     * All collapse/expand functionality is added solely in CSS.
     * Wrapping `<label>` instead of placing it after the checkbox to avoid having to set a unique id on each input (for `<label for="...">` referencing).
     * Label text is set in CSS with `::after` contents, in line with the pure CSS toggling approach.
     * Using `::after` also removes the need to style with `user-select: none`, which messes up the formatting on copied text.
     */
    const expansionToggle = createElement("label", {class: "ports-expansion-toggle", "aria-label": "Toggle ports list expansion"},
        createElement("input", {type: "checkbox"})
        /* `::after=➕︎/➖︎` */
    );
    manyPorts.appendChild(expansionToggle);

    /****Expandable container:** `<span class="ports-expansion-target">` with `<span class="port">{port[i]}</span>{ }` children */
    const portsContainer = createElement("span", {class: "ports-expansion-target"});
    for (const p of ports) {
        portsContainer.append(
            createElement("span", {class: "port"}, p),
            // Adding a space after each span for text copyability and improved appearance when collapsed
            " "
        );
    }
    manyPorts.appendChild(portsContainer);

    // Row finally fully populated
    return row;
}

// TODO rework this when flipping data structure as discussed in issue #47: https://github.com/ACK-J/Port_Authority/issues/47
/**
 * Data fetching only, separated from rendering logic
 * @param {"blocked_ports" | "blocked_hosts"} data_type Which storage key to extract the blocking activity data from
 */
async function fetchBlockingDataForCurrentTab(data_type) {
    const all_tabs_data = await getItemFromLocal(data_type, {});
    if (isObjectEmpty(all_tabs_data)) return;

    const tabId = await getActiveTabId();
    return all_tabs_data[tabId];
}

// Populate `#blocked-ports` with table rows
const blockedPortsWrapper = document.getElementById("blocked-ports");
const renderBlockedPorts = renderObjectFactory({
    // TODO figure out a way to globally ignore this specific warning since it crops up a lot and is intentionally avoided
    // @ts-ignore (potentially `null` element passed. Want to fail quick if the DOM doesn't match expectations)
    wrapper: blockedPortsWrapper,
    // @ts-ignore (potentially `null` element passed. Want to fail quick if the DOM doesn't match expectations)
    destination: blockedPortsWrapper.querySelector(".dropzone"),
    fetchData: ()=>fetchBlockingDataForCurrentTab("blocked_ports"),
    renderItem: buildBlockedPortsRow
});

// Populate `#blocked-hosts` with `<li>{host}</li>` values
const blockedHostsWrapper = document.getElementById("blocked-hosts");
const updateBlockedHostsDisplay = renderArrayFactory({
    // @ts-ignore (potentially `null` element passed. Want to fail quick if the DOM doesn't match expectations)
    wrapper: blockedHostsWrapper,
    // @ts-ignore (potentially `null` element passed. Want to fail quick if the DOM doesn't match expectations)
    destination: blockedHostsWrapper.querySelector('.dropzone'),
    fetchData: ()=>fetchBlockingDataForCurrentTab("blocked_hosts"),
    renderItem: (host)=>createElement("li", {}, host)
});

// Helper function for calling all DOM-Modifying functions
// TODO live re-rendering on data change, related to issue #50: https://github.com/ACK-J/Port_Authority/issues/50
function buildDataMarkup() {
    // Shows any and all hosts that attempted to connect to a tracking service
    updateBlockedHostsDisplay();
    // Shows any and all ports that were blocked from scanning. Ports are sorted based on host that attempted the port scan
    renderBlockedPorts();
}

buildDataMarkup();
