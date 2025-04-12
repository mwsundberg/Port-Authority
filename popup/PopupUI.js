import { getItemFromLocal } from "../global/BrowserStorageManager.js";
import { isObjectEmpty } from "../global/utils.js";
import { getActiveTabId } from "../global/browserActions.js";
import { createElement, renderArrayFactory, renderObjectFactory } from "../global/domUtils.js";

/**
 * Data fetching only, separated from rendering logic
 * @param {"blocked_ports" | "blocked_hosts"} data_type Which storage key to extract the blocking activity data from
 */
async function fetchBlockingDataForCurrentTab(data_type) {
    // TODO rework this when flipping data structure as discussed in issue #47: https://github.com/ACK-J/Port_Authority/issues/47
    const all_tabs_data = await getItemFromLocal(data_type, {});
    if (isObjectEmpty(all_tabs_data)) return;

    const tabId = await getActiveTabId();
    return all_tabs_data[tabId];
}

/**
 * **A row in the popup display for "Blocked Port Scans"**
 * 
 * Has a side-effect of pluralizing "Ports" in the table header if multiple ports on the same hostname encountered
 * @param {string} host The LAN hostname/IP that was accessed
 * @param {string[]} ports Which port(s) were scanned
 * @returns {Element} A table row with one of the following structures
 * 
 * **Multiple ports on the same hostname:**
 * 
 * *Note that the expansion/collapsing of the ports list is handled purely in CSS*
 * ```html
 * <tr>
 *     <td class="host-cell">{host}</td>
 *     <td class="ports-cell">
 *         <span class="many-ports">
 *             <span class="ports-expansion-target">
 *                 <span class="port">{ports[0]}</span><!-- whitespace -->
 *                 <span class="port">{ports[1]}</span><!-- whitespace -->
 *                 <span class="port">{...}</span><!-- whitespace, simpler to leave than remove -->
 *             </span>
 *             <label class="ports-expansion-toggle" aria-label="Toggle ports list expansion">
 *                 <input type="checkbox">
 *                 <!-- `::after=➕︎/➖︎` -->
 *             </label>
 *         </span>
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
 *     <!-- Ports `<td>` Removed -->
 * </tr>
 * ```
 */
function buildBlockedPortsRow(host, ports) {
    /****Main container:** `<tr>`
     * The function's return value. Has a cell for the host and a cell for the ports scanned on that host (cell removed if empty array). */
    const row = document.createElement("tr");

    /****Table cell for the hostname:** `<td class="host-cell">{host}</td>` */
    const hostCell = createElement("td", {class: "host-cell"}, host);
    row.appendChild(hostCell);

    // No ports case: return early and warn
    if (ports.length === 0) {
        console.warn("No port supplied when rendering blocked portscans for '" + host + "'");

        return row;
    }

    /****Table cell for the ports:** `<td class="ports-cell">` */
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
    document.querySelector("#blocked_ports .ports-header-cell").innerText = "Ports";

    // Good to have low-number privileged ports first
    ports.sort((a, b)=>(+a - +b));
    
    /****Wrapper element:** `<span class="many-ports">`
     * Needed since styling `<td>`s with `display` sometimes breaks accessiblity ({@link https://developer.mozilla.org/en-US/docs/Web/CSS/display#tables | MDN citation}).
     * Using a span since a `<div>` with `display: block` messes up the formatting of copied text. */
    const manyPorts = createElement("span", {class: "many-ports"});
    portsCell.appendChild(manyPorts);

    /****Expandable container for multiple ports:** `<span class="ports-expansion-target">` with `<span class="port">{port[i]}</span>{" "}` children */
    const portsContainer = createElement("span", {class: "ports-expansion-target"});
    for (const p of ports) {
        portsContainer.append(
            createElement("span", {class: "port"}, p),
            // Adding a space after each span for text copyability and improved appearance when collapsed
            " "
        );
    }
    manyPorts.appendChild(portsContainer);

    /****Expansion toggle:** `<label class="ports-expansion-toggle" aria-label="Toggle ports list expansion"><input type="checkbox">{::after=➕︎/➖︎}</label>`
     * 
     * Collapse/expand functionality is added with CSS.
     * Wrapping `<label>` instead of placing it after the checkbox to avoid having to set a unique id on each input.
     * Label text is set in CSS with `::after` contents.
     */
    const expansionToggle = createElement("label", {class: "ports-expansion-toggle", "aria-label": "Toggle ports list expansion"},
        createElement("input", {type: "checkbox"})
        /* `::after=➕︎/➖︎` */
    );
    manyPorts.appendChild(expansionToggle);

    // Row finally fully populated
    return row;
}

// Populate `#blocked_ports` with table rows
const blockedPortsWrapper = document.getElementById("blocked_ports");
const renderBlockedPorts = renderObjectFactory({
    wrapper: blockedPortsWrapper,
    destination: blockedPortsWrapper.querySelector(".dropzone"),
    fetchData: ()=>fetchBlockingDataForCurrentTab("blocked_ports"),
    renderItem: buildBlockedPortsRow
});

// Populate `#blocked_hosts` with rows of `<li>{host}</li>`
const blockedHostsWrapper = document.getElementById("blocked_hosts");
const renderBlockedHosts = renderArrayFactory({
    wrapper: blockedHostsWrapper,
    destination: blockedHostsWrapper.querySelector('.dropzone'),
    fetchData: ()=>fetchBlockingDataForCurrentTab("blocked_hosts"),
    renderItem: (host)=>createElement("li", {}, host)
});

// TODO live rerendering on data change, could use storage event coordinating as discussed in issue #50: https://github.com/ACK-J/Port_Authority/issues/50
renderBlockedHosts();
renderBlockedPorts();
