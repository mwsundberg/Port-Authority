import { getItemFromLocal } from "../global/BrowserStorageManager.js";
import { isObjectEmpty } from "../global/utils.js";
import { getActiveTabId } from "../global/browserActions.js";
import { createElement, renderArrayFactory, renderObjectFactory } from "../global/domUtils.js";

/**
 * A row in the popup display for "Blocked Port Scans"
 * @param {string} domain The LAN domain/IP that was accessed
 * @param {string[]} ports Which port(s) were scanned. Still handled properly if no ports are provided, yet bad practice
 * @returns {Element} A table row with one of the following structures
 * 
 * 
 * **Multiple ports on the same domain:**
 * 
 * *Note that the expansion/collapsing of the ports list is handled purely in CSS, using logic similar to `switchButton.css`.*
 * ```html
 * <tr>
 *     <td class="domain-cell">{domain}</td>
 *     <td class="ports-cell flex-row-flipped">
 *         <input type="checkbox" class="ports-expansion-toggle" aria-label="Toggle ports list expansion">
 *         <span class="many-ports ports-expansion-target">
 *             <span>{ports[0]}</span><!-- whitespace -->
 *             <span>{ports[1]}</span><!-- whitespace -->
 *             <span>{...}</span><!-- whitespace still added on last item, not strictly neccessary since gap before checkbox is added with `flex-gap` -->
 *         </span>
 *     </td>
 * </tr>
 * ```
 * 
 * **One port:**
 * ```html
 * <tr>
 *     <td class="domain-cell">{domain}</td>
 *     <td class="ports-cell one-port">
 *         {ports[0]}
 *     </td>
 * </tr>
 * ```
 * 
 * **No ports provided (will `console.warn` too):**
 * ```html
 * <tr>
 *     <td class="domain-cell">{domain}</td>
 *     <!-- No `<td>` for the ports, intentionally -->
 * </tr>
 * ```
 */
function buildBlockedPortsRow(domain, ports) {
    const row = document.createElement("tr");

    // Domain table cell: `<td class="domain-cell">{domain}</td>`
    const domainCell = createElement("td", {class: "domain-cell"}, domain);
    row.appendChild(domainCell);

    // No ports case: return early
    if (ports.length === 0) {
        console.warn("No port supplied when rendering blocked portscans for '" + domain + "'");

        return row;
    }

    // Common `td.ports-cell` construction
    const portsCell = createElement("td", {class: "ports-cell"});
    row.appendChild(portsCell);

    // One port: `<td class="ports-cell one-port">{port}</td>`
    if (ports.length === 1) {
        portsCell.classList.add("one-port");
        portsCell.innerText = ports[0];

        return row;
    }

    // Multiple ports: see JSDoc for full structure
    // Flip display order so the toggle to expand the ports list shows last
    portsCell.classList.add("flex-row-flipped");

    // Expansion toggle: `<input type="checkbox" class="ports-expansion-toggle" aria-label="Toggle ports list expansion">`
    // Comes first in DOM yet visually placed after the ports list
    // The "`<label>`" text is added with `input::after` since need to change what's shown ("+" or "-") based on `input:checked` status
    portsCell.appendChild(
        createElement(
            "input", {
                type: "checkbox",
                class: "ports-expansion-toggle",
                "aria-label": "Toggle ports list expansion"
        })
    );

    // Expandable container: `<span class="many-ports ports-expansion-target">` with `<span>{port[i]}</span>{ }` children
    const portsContainer = createElement("span", {class: ["many-ports", "ports-expansion-target"]});
    for (const p of ports) {
        portsContainer.append(
            createElement("span", {}, p),
            // Adding a space after each span for text copyability and improved appearance when collapsed
            " "
        );
    }
    portsCell.appendChild(portsContainer);

    // Row finally fully populated
    return row;
}

// TODO rework this when flipping data structure as discussed in issue #47: https://github.com/ACK-J/Port_Authority/issues/47
/**
 * Data fetching only, separated from rendering
 * @param {"blocked_ports" | "blocked_hosts"} data_type Which storage key to extract the blocking activity data from
 */
async function getCurrentTabsBlockingData(data_type) {
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
    fetchData: ()=>getCurrentTabsBlockingData("blocked_ports"),
    renderItem: buildBlockedPortsRow
});

// Populate `#blocked-hosts` with `<li>{host}</li>` values
const blockedHostsWrapper = document.getElementById("blocked-hosts");
const updateBlockedHostsDisplay = renderArrayFactory({
    // @ts-ignore (potentially `null` element passed. Want to fail quick if the DOM doesn't match expectations)
    wrapper: blockedHostsWrapper,
    // @ts-ignore (potentially `null` element passed. Want to fail quick if the DOM doesn't match expectations)
    destination: blockedHostsWrapper.querySelector('.dropzone'),
    fetchData: ()=>getCurrentTabsBlockingData("blocked_hosts"),
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
