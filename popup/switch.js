import { getItemFromLocal, setItemInLocal } from "../global/BrowserStorageManager.js";

// Can attach options page link instantly
document.getElementById('settings').addEventListener("click", () =>
    browser.runtime.openOptionsPage());

// Blocking switch bindings (handled with `.then()` to allow for parallel setup of notifications switch)
getItemFromLocal("blocking_enabled", true).then((blocking_enabled) => {
    const blocking_switch = document.getElementById("blocking_switch");

    blocking_switch.checked = blocking_enabled;
    blocking_switch.addEventListener("change", (ev) =>
        browser.runtime.sendMessage({
            type: 'toggleEnabled',
            value: ev.target.checked
        }));
});

// Notifications switch bindings
getItemFromLocal("notificationsAllowed", true).then((notificationsAllowed) => {
    const notifications_switch = document.getElementById("notifications_switch");

    notifications_switch.checked = notificationsAllowed;
    notifications_switch.addEventListener("change", (ev) =>
        setItemInLocal("notificationsAllowed", ev.target.checked)
    );
});


// Clear the loading class that was disabling the slider animations when we were setting the initial values
setTimeout(()=>document.body.classList.remove('loading'), 5);