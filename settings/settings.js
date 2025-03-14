import { getItemFromLocal, modifyItemInLocal } from "../global/BrowserStorageManager.js";
import { extractURLHost } from "../global/utils.js";

/**
 * A single row in the allowed domain list display
 * @param {string} domain The raw representation of the domain, used both for display and storage
 * @param {AbortSignal} abort_signal Signal to disable the 'remove' button
 * @returns {Element} `<tr><td>{domain}</td><td><button onclick="remove & refresh display">Remove</button></td></tr>`
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

    const domain_cell = document.createElement("td");
    domain_cell.classList.add("selectable", "domain-cell"); // Make sure the domain is selectable for copying
    domain_cell.innerText = domain;
    row.appendChild(domain_cell);

    const button_cell = document.createElement("td");
    button_cell.classList.add("controls-cell");
    const button = document.createElement("button");
    button.innerText = "✕";
    button.ariaLabel = `Remove '${domain}' from allowlist`;
    button.addEventListener("click", remove_domain, {signal: abort_signal}); // By triggering `remove_buttons_event_controller.abort()`, all buttons with this signal passed will have their listeners removed
    button_cell.appendChild(button);
    row.appendChild(button_cell);

    return row;
}

let remove_buttons_event_controller;
async function load_allowed_domains() {
    // Remove all of the stale listeners (might not need this since calling `replaceChildren` should kill all the children's listeners, but better safe than sorry)
    if (remove_buttons_event_controller) remove_buttons_event_controller.abort();

    // Make a new AbortController for all of the fresh buttons
    remove_buttons_event_controller = new AbortController();

    const allowed_domain_list = await getItemFromLocal(
        "allowed_domain_list",
        []
    );

    // Clear the table
    const table_body = document.getElementById("allowedDomainsTableContents");
    table_body.replaceChildren();

    // If no domains need to be added, hide the table and return early
    const table = document.getElementById("allowedDomainsTable");
    if(allowed_domain_list.length === 0) {
        table.classList.add("unpopulated");
        return;
    } else {
        table.classList.remove("unpopulated");
    }

    // Populate the table rows
    allowed_domain_list.forEach((domain) => {
        const new_row = allowed_domain_row(domain, remove_buttons_event_controller.signal);
        table_body.appendChild(new_row);
    });
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