import { getItemFromLocal } from "../global/BrowserStorageManager.js";
import { isObjectEmpty } from "../global/utils.js";
import { getActiveTabId } from "../global/browserActions.js";

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

    // Domain table cell
    const domainCell = document.createElement("td");
    domainCell.classList.add("domain-cell");
    domainCell.innerText = domain;
    row.appendChild(domainCell);

    // No ports case: return early
    if (ports.length === 0) {
        console.warn("No port supplied rendering blocked portscans for '" + domain + "'");

        return row;
    }

    // Common `td.ports-cell` construction
    const portsCell = document.createElement("td");
    portsCell.classList.add("ports-cell");
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
    const expansionToggle = document.createElement("input");
    expansionToggle.setAttribute("type", "checkbox");
    expansionToggle.classList.add("ports-expansion-toggle");
    expansionToggle.ariaLabel = "Toggle ports list expansion";
    portsCell.appendChild(expansionToggle);

    // Expandable container: `<span class="many-ports ports-expansion-target">` with `<span>{port[i]}</span>{ }` children
    const portsContainer = document.createElement("span");
    portsContainer.classList.add("many-ports", "ports-expansion-target");
    for (const p of ports) {
        const span = document.createElement("span");
        span.innerText = p;
        
        portsContainer.appendChild(span);
        // Adding a space after for text copyability and improved appearance when collapsed
        portsContainer.appendChild(document.createTextNode(" "));
    }
    portsCell.appendChild(portsContainer);

    // Row finally fully populated
    return row;
}

/**
 * Data fetching only, separated from rendering
 * @param {"blocked_ports" | "blocked_hosts"} data_type Which storage key to extract the blocking activity data from
 * 
 * // TODO rework this when flipping data structure as discussed in issue #47: https://github.com/ACK-J/Port_Authority/issues/47
 */
async function getCurrentTabsBlockingData(data_type) {
    const all_tabs_data = await getItemFromLocal(data_type, {});
    if (isObjectEmpty(all_tabs_data)) return;

    const tabId = await getActiveTabId();
    return all_tabs_data[tabId];
}

/**
 * Displays a list of blocked ports in the popup UI.
 * Data is re-rendered each time the popup is opened.
 * // TODO live re-rendering on data change, related to issue #50: https://github.com/ACK-J/Port_Authority/issues/50
 */
const blockedPortsWrapper = document.getElementById("blocked-ports");
const blockedPortsContents = blockedPortsWrapper.querySelector(".dropzone");
async function renderBlockedPorts() {
    const blockedPortsList = await getCurrentTabsBlockingData("blocked_ports");

    // Clear stale contents, if any
    blockedPortsContents.replaceChildren()

    // Early return, hiding wrapper if no data provided
    if(!blockedPortsList) {
        blockedPortsWrapper.classList.add("unpopulated");
        return;
    };

    // Populate the table rows
    for(const domain in blockedPortsList) {
        const newRow = buildBlockedPortsRow(domain, blockedPortsList[domain]);

        blockedPortsContents.appendChild(newRow);
    }

    // Toggle visibility on the container wrapper at end
    blockedPortsWrapper.classList.remove("unpopulated");
}

const blocked_hosts_display = document.getElementById("blocked-hosts");
const blocked_hosts_inner = blocked_hosts_display.querySelector(".dropzone");
async function updateBlockedHostsDisplay() {
    const data_blocked_hosts = await getCurrentTabsBlockingData("blocked_hosts");
    if(!data_blocked_hosts) return;
    console.log("Hosts data: ", data_blocked_hosts)

    // Build a list of host names as li elements
    for (const host_name of data_blocked_hosts) {
        // Create the list element for the blocked host and set the text to the hosts name
        const host_li = document.createElement("li");
        host_li.innerText = host_name;

        // Add the list element to the hosts UL
        blocked_hosts_inner.appendChild(host_li);
    }
    // Toggle visibility on the container wrapper at end
    blocked_hosts_display.classList.remove("unpopulated");
}

// Helper function for calling all DOM-Modifying functions
function buildDataMarkup() {
    // Shows any and all hosts that attempted to connect to a tracking service
    updateBlockedHostsDisplay();
    // Shows any and all ports that were blocked from scanning. Ports are sorted based on host that attempted the port scan
    renderBlockedPorts();
}

buildDataMarkup();
