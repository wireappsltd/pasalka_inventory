import { _t } from "@web/core/l10n/translation";
import { browser } from "@web/core/browser/browser";
import { router } from "@web/core/browser/router";
import { registry } from "@web/core/registry";
import { user } from "@web/core/user";

function activateAssetsDebugging({ env }) {
    return {
        type: "item",
        description: _t("Activate Assets Debugging"),
        callback: () => {
            browser.location.search = "?debug=assets";
        },
        sequence: 410,
    };
}

function activateTestsAssetsDebugging({ env }) {
    return {
        type: "item",
        description: _t("Activate Tests Assets Debugging"),
        callback: () => {
            browser.location.search = "?debug=assets,tests";
        },
        sequence: 420,
    };
}

export function regenerateAssets({ env }) {
    return {
        type: "item",
        description: _t("Regenerate Assets Bundles"),
        callback: async () => {
            await env.services.orm.call("ir.attachment", "regenerate_assets_bundles");
            browser.location.reload();
        },
        sequence: 430,
    };
}

function becomeSuperuser({ env }) {
    const becomeSuperuserURL = browser.location.origin + "/web/become";
    return {
        type: "item",
        description: _t("Become Superuser"),
        hide: !user.isAdmin,
        href: becomeSuperuserURL,
        callback: () => {
            browser.open(becomeSuperuserURL, "_self");
        },
        sequence: 440,
    };
}

function leaveDebugMode() {
    return {
        type: "item",
        description: _t("Leave the Developer Tools"),
        callback: () => {
            router.pushState({ debug: undefined }, { reload: true });
        },
        sequence: 450,
    };
}

registry
    .category("debug")
    .category("default")
    .add("activateAssetsDebugging", activateAssetsDebugging)
    .add("regenerateAssets", regenerateAssets)
    .add("becomeSuperuser", becomeSuperuser)
    .add("leaveDebugMode", leaveDebugMode)
    .add("activateTestsAssetsDebugging", activateTestsAssetsDebugging);
