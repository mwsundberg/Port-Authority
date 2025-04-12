import { getItemFromLocal, modifyItemInLocal } from "../global/BrowserStorageManager.js";
import { createElement } from "../global/domUtils.js";

/**
 * A single item in the allowlist display
 * @param {string} domain Technically a `URL.host` aka domain + port
 * @param {AbortSignal} abort_signal Signal to kill the 'remove' button listeners when rerendering the table
 * @returns {Element}
 * ```html
 * <li>
 *     <span>{domain}</span>
 *     <button onclick="{remove & refresh display}"
 *             class="unselectable"
 *             aria-label="Remove {domain} from allowlist">
 *         ✕
 *     </button>
 * </li>
 * ```
 */
function allowed_domain_item(domain, abort_signal) {
    /** Added to the remove button's onclick, a closure that uses the `domain` value from `allow_domain_item`'s arguments */
    const remove_domain = async () => {
        // Remove the current domain from the list
        await modifyItemInLocal("allowed_domain_list", [],
            (list) => list.filter(
                (d) => d !== domain
            ));

        // Refresh the domain list displayed
        load_allowed_domains();
    }

    /****Main container:** `<li>` */
    const item = document.createElement("li");

    /****Domain:** `<span>{domain}</span>` */
    const domainCell = createElement("span", {}, domain);
    item.appendChild(domainCell);

    /****Remove domain button:** `<button class="unselectable" aria-label="Remove {domain} from allowlist">✕</button>`
     * Note that `.unselectable` is applied to disable the selectable effect applied at the `<ul>` level. */
    const removeButton = createElement("button", {class: "unselectable", "aria-label": `Remove '${domain}' from allowlist`}, "✕");
    removeButton.addEventListener("click", remove_domain, {signal: abort_signal}); // By triggering `remove_buttons_event_controller.abort()`, all buttons with this signal passed will have their listeners removed
    item.appendChild(removeButton);

    return item;
}

let remove_buttons_event_controller;
const list_contents = document.getElementById("allowlist_contents");
const allowlist_section = document.getElementById("allowlist_section");
async function load_allowed_domains() {
    // Remove all of the stale listeners
    // TODO figure out if this is needed, unsure since calling `replaceChildren` could do listener cleanup on the deleted children
    // If it's removable can replace this all with a `renderArrayFactory`
    if (remove_buttons_event_controller) remove_buttons_event_controller.abort();

    // Make a new AbortController for all of the fresh buttons
    remove_buttons_event_controller = new AbortController();

    const allowed_domain_list = await getItemFromLocal(
        "allowed_domain_list",
        []
    );

    // Clear stale contents, if any
    list_contents.replaceChildren();

    // Early return, hiding wrapper if no data provided
    if(allowed_domain_list?.length === 0) {
        allowlist_section.setAttribute("hidden", "");
        return;
    }

    // Populate the list items
    for(const domain of allowed_domain_list) {
        const new_row = allowed_domain_item(domain, remove_buttons_event_controller.signal);

        list_contents.appendChild(new_row);
    };

    // Toggle visibility on the container wrapper at end
    allowlist_section.removeAttribute("hidden");
}

/**
 * Get a well-formed host to match against from an user-supplied URL
 * @param {string} text A URL-like value (eg `https://example.com/file/path/etc`, `discord.com/invite/abcdefg`, `example.com:8080`)
 * @returns {string} Well formatted host portion of url (eg `example.com`, `discord.com`, `example.com:8080`)
 * 
 * @throws Parsing an invalid URL
 */
function extractURLHost(text) {
    let url = text + ""; // cast to string (is this needed?)

    // We don't actually care about the protocol as we only compare url.host
    // But the URL object will fail to create if no protocol is provided
    if (!url.match(/^\w*:\/\//)) {
        url = "http://" + url;
    }
    const newUrl = new URL(url);
    return newUrl.host;
}

async function saveOptions(e) {
    // Prevent the form submit event from reloading the page and hiding `alert`s used for feedback
    e.preventDefault();

    let url;
    try {
        url = extractURLHost(e.target[0].value);
    } catch(error) {
        console.error(error);
        alert("Please enter a valid domain.");
        return;
    }
    // Clear the URL box since no longer clearing by reloading on form submit
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

    // Rerender the table since no longer relying on the form submitting to reload the page
    load_allowed_domains();
}

load_allowed_domains();
document.getElementById("allowlist_add_form").addEventListener("submit", saveOptions);
