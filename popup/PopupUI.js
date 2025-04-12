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
 * An item in the popup display for "Blocked Port Scans"
 * @param {string} host The LAN hostname/IP that was accessed
 * @param {string[]} ports Which port(s) were scanned
 * @returns {Element} A container that represents a portscanned domain and the ports that were scanned 
 */
function buildBlockedPortsItem(host, ports) {
    const container = createElement("li", {class: "blocked-host-item"});

    // The host/domain itself
    const hostSpan = createElement("span", {class: "host"}, host);
    container.appendChild(hostSpan);

    // No ports case: return early and warn
    if (ports.length === 0) {
        console.warn("No port supplied when rendering blocked portscans for '" + host + "'");

        return container;
    }

    // Put low-number privileged ports first in the list
    ports.sort((a, b)=>(+a - +b));

    /**"View Ports" toggle
     * 
     * Collapse/expand functionality is added with CSS.
     * Wrapping `<label>` instead of placing it after the checkbox to avoid having to set a unique id on each input.
     */
    const expansionToggle = createElement("label", {class: ["ports-expansion-toggle", "unselectable"]},
        [
            createElement("input", {type: "checkbox"}),
            "View Ports"
        ]
    );
    container.appendChild(expansionToggle);

    // Expandable container for the ports list
    const portsContainer = createElement("ul", {class: "ports-expansion-target"});
    for (const p of ports) {
        portsContainer.append(
            createElement("li", {class: "port"}, p),
        );
    }
    container.appendChild(portsContainer);

    // Item finally fully populated
    return container;
}

// Populate `#blocked_ports` with `<li>` with an expandable port list
const blockedPortsWrapper = document.getElementById("blocked_ports");
const renderBlockedPorts = renderObjectFactory({
    wrapper: blockedPortsWrapper,
    destination: blockedPortsWrapper.querySelector(".dropzone"),
    fetchData: ()=>fetchBlockingDataForCurrentTab("blocked_ports"),
    renderItem: buildBlockedPortsItem
});

// Populate `#blocked_hosts` with `<li>{host}</li>`
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
