import { getItemFromLocal, modifyItemInLocal } from "../global/BrowserStorageManager.js";
import { createElement } from "../global/domUtils.js";
import { extractURLHost } from "../global/utils.js";

/**
 * A single row in the allowed domain list display
 * @param {string} domain The raw representation of the domain, used both for display and storage
 * @param {AbortSignal} abort_signal Signal to disable the 'remove' button
 * @returns {Element}
 * ```html
 * <tr>
 *     <td class="domain-cell">{domain}</td>
 *     <td class="controls-cell">
 *         <button onclick="{remove & refresh display}"
 *                 class="unselectable"
 *                 aria-label="Remove {domain} from allowlist">
 *             ✕
 *         </button>
 *     </td>
 * </tr>
 * ```
 */
function allowed_domain_row(domain, abort_signal) {
    const remove_domain = async () => {
        // Remove the current domain from the list
        await modifyItemInLocal("allowed_domain_list", [],
            (list) => list.filter(
                (d) => d !== domain
            ));

        // Refresh the domain list displayed
        load_allowed_domains();
    }

    // Build out the DOM for the table row
    const row = document.createElement("tr");

    // Domain cell: `<td class="domain-cell selectable">{domain}</td>`
    const domainCell = createElement("td", {class: "domain-cell"}, domain);
    row.appendChild(domainCell);

    const controlsCell = createElement("td", {class: "controls-cell"});

    // Remove domain button: `<button class="unselectable" aria-label="Remove {domain} from allowlist">✕</button>`
    // Note that `.unselectable` is applied to escape the selectable effect applied at the `<tbody>` level
    const removeButton = createElement("button", {class: "unselectable", "aria-label": `Remove '${domain}' from allowlist`}, "✕");
    removeButton.addEventListener("click", remove_domain, {signal: abort_signal}); // By triggering `remove_buttons_event_controller.abort()`, all buttons with this signal passed will have their listeners removed
    controlsCell.appendChild(removeButton);
    row.appendChild(controlsCell);

    return row;
}

let remove_buttons_event_controller;
const table_body = document.getElementById("allowedDomainsTableContents");
const table = document.getElementById("allowedDomainsTable");
async function load_allowed_domains() {
    // Remove all of the stale listeners
    // TODO figure out if this all is needed, unsure since calling `replaceChildren` might or might not do listener cleanup on the deleted children
    if (remove_buttons_event_controller) remove_buttons_event_controller.abort();

    // Make a new AbortController for all of the fresh buttons
    remove_buttons_event_controller = new AbortController();

    const allowed_domain_list = await getItemFromLocal(
        "allowed_domain_list",
        []
    );

    // Clear stale contents, if any
    table_body.replaceChildren();

    // Early return, hiding wrapper if no data provided
    if(allowed_domain_list.length === 0) {
        table.classList.add("unpopulated");
        return;
    }

    // Populate the table rows
    for(const domain of allowed_domain_list) {
        const new_row = allowed_domain_row(domain, remove_buttons_event_controller.signal);

        table_body.appendChild(new_row);
    };

    // Toggle visibility on the container wrapper at end
    table.classList.remove("unpopulated");
}

async function saveOptions(e) {
    // Prevent the form submit event from reloading the page
    e.preventDefault();

    let url;
    try {
        url = extractURLHost(e.target[0].value);
    } catch(error) {
        console.error(error);
        alert("Please enter a valid domain.");
        return;
    }
    document.getElementById("add_domain").value = "";


    await modifyItemInLocal("allowed_domain_list", [],
        (list) => {
            // Only update the list if it's a new member
            if (!list.includes(url)) {
                return list.concat(url);
            } else {
                alert("This domain is already in the list.");
                return list;
            }
        });

    // Refresh the table since no longer relying on the form submitting to reload the page
    load_allowed_domains();
}

load_allowed_domains();
document.getElementById("allowlist_add_form").addEventListener("submit", saveOptions);