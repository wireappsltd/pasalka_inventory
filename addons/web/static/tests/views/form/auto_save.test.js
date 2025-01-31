import { expect, test } from "@odoo/hoot";
import { animationFrame, Deferred, mockSendBeacon, tick } from "@odoo/hoot-mock";
import { unload } from "@odoo/hoot-dom";
import {
    contains,
    defineActions,
    defineModels,
    fieldInput,
    fields,
    getService,
    makeServerError,
    models,
    mountView,
    mountWithCleanup,
    onRpc,
} from "../../web_test_helpers";

import { WebClient } from "@web/webclient/webclient";

const hideTab = () => {
    Object.defineProperty(document, "visibilityState", {
        value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    return tick();
};

onRpc("has_group", () => true);

class Partner extends models.Model {
    name = fields.Char();
    expertise = fields.Char({ default: "Marketing" });
    _records = [
        { id: 1, name: "Xavier Lancer", expertise: "Sales" },
        { id: 2, name: "Keth MacBeat", expertise: "HR" },
    ];
}

defineModels([Partner]);

test("save on hiding tab", async () => {
    onRpc("web_save", () => {
        expect.step("save");
    });
    await mountView({
        type: "form",
        resModel: "partner",
        arch: `<form><field name="name"/></form>`,
        resId: 1,
    });
    expect('.o_field_widget[name="name"] input').toHaveValue("Xavier Lancer");
    await fieldInput("name").edit("Mathiew Brown");
    await hideTab();
    expect.verifySteps(["save"]);
});

test("save on hiding tab (not dirty)", async () => {
    onRpc("web_save", () => {
        expect.step("save");
    });
    await mountView({
        type: "form",
        resModel: "partner",
        arch: `<form><field name="name"/></form>`,
        resId: 1,
    });
    await hideTab();
    // should not have saved
    expect.verifySteps([]);
});

test("save on hiding tab (invalid field)", async () => {
    onRpc("web_save", () => {
        expect.step("save");
    });
    await mountView({
        type: "form",
        resModel: "partner",
        arch: `<form><field name="name" required="1"/></form>`,
    });
    await hideTab();
    // should not save because of invalid field
    expect.verifySteps([]);
});

test("save only once when hiding tab several times quickly", async () => {
    onRpc("web_save", () => {
        expect.step("save");
    });
    await mountView({
        type: "form",
        resModel: "partner",
        arch: `<form><field name="name"/></form>`,
        resId: 1,
    });
    expect('.o_field_widget[name="name"] input').toHaveValue("Xavier Lancer");
    await fieldInput("name").edit("Mathiew Brown");
    await hideTab();
    await hideTab();
    await hideTab();
    // should have saved, but only once
    expect.verifySteps(["save"]);
});

test.tags("desktop")(`save when page changed`, async () => {
    defineActions([
        {
            id: 1,
            name: "Partner",
            res_model: "partner",
            type: "ir.actions.act_window",
            views: [
                [false, "list"],
                [false, "form"],
            ],
        },
    ]);

    Partner._views = {
        list: `<tree><field name="name"/></tree>`,
        form: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        search: `<search/>`,
    };

    onRpc("web_save", ({ args }) => {
        expect.step("web_save");
        expect(args).toEqual([[1], { name: "aaa" }]);
    });
    await mountWithCleanup(WebClient);
    await getService("action").doAction(1);
    await contains(`.o_data_row td.o_data_cell`).click();
    expect(`.o_breadcrumb`).toHaveText("Partner\nXavier Lancer");

    await contains(`.o_field_widget[name='name'] input`).edit("aaa");
    await contains(`.o_pager button.o_pager_next`).click();
    expect.verifySteps(["web_save"]);
    expect(`.o_form_editable`).toHaveCount(1);
    expect(`.o_breadcrumb`).toHaveText("Partner\nKeth MacBeat");
    expect(`.o_field_widget[name="name"] input`).toHaveValue("Keth MacBeat");

    await contains(`.o_form_button_cancel`, { visible: false }).click();
    expect(`.o_breadcrumb`).toHaveText("Partner\nKeth MacBeat");
    expect(`.o_field_widget[name="name"] input`).toHaveValue("Keth MacBeat");

    await contains(`.o_pager button.o_pager_previous`).click();
    expect(`.o_form_saved`).toHaveCount(1);
    expect(`.o_breadcrumb`).toHaveText("Partner\naaa");
    expect(`.o_field_widget[name="name"] input`).toHaveValue("aaa");
});

test.tags("desktop")(`save when breadcrumb clicked`, async () => {
    defineActions([
        {
            id: 1,
            name: "Partner",
            res_model: "partner",
            type: "ir.actions.act_window",
            views: [
                [false, "list"],
                [false, "form"],
            ],
        },
    ]);

    Partner._views = {
        list: `<tree><field name="name"/></tree>`,
        form: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        search: `<search/>`,
    };

    onRpc("web_save", ({ args }) => {
        expect.step("web_save");
        expect(args).toEqual([[1], { name: "aaa" }]);
    });

    await mountWithCleanup(WebClient);
    await getService("action").doAction(1);
    expect(`.o_field_cell:eq(0)`).toHaveText("Xavier Lancer");

    await contains(`.o_data_row td.o_data_cell`).click();
    expect(`.o_breadcrumb`).toHaveText("Partner\nXavier Lancer");

    await contains(`.o_field_widget[name='name'] input`).edit("aaa");
    await contains(`.breadcrumb-item.o_back_button`).click();
    expect.verifySteps(["web_save"]);
    expect(`.o_breadcrumb`).toHaveText("Partner");
    expect(`.o_field_cell:eq(0)`).toHaveText("aaa");

    await contains(`.o_data_row td.o_data_cell`).click();
    expect(`.o_form_editable`).toHaveCount(1);
    expect(`.o_breadcrumb`).toHaveText("Partner\naaa");
    expect('.o_field_widget[name="name"] input').toHaveValue("aaa");
});

test.tags("desktop")(`error on save when breadcrumb clicked`, async () => {
    defineActions([
        {
            id: 1,
            name: "Partner",
            res_model: "partner",
            type: "ir.actions.act_window",
            views: [
                [false, "list"],
                [false, "form"],
            ],
        },
    ]);

    Partner._views = {
        list: `<tree><field name="name"/></tree>`,
        form: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        search: `<search/>`,
    };

    onRpc("web_save", () => {
        expect.step("web_save");
        throw makeServerError({ message: "Cannot save" });
    });
    await mountWithCleanup(WebClient);
    await getService("action").doAction(1);
    await contains(`.o_data_row td.o_data_cell`).click();

    await contains(`.o_field_widget[name='name'] input`).edit("aaa");
    await contains(`.breadcrumb-item.o_back_button`).click();
    expect.verifySteps(["web_save"]);
    await animationFrame();
    expect(`.o_error_dialog`).toHaveCount(1);
});

test.tags("desktop")(`save when action changed`, async () => {
    defineActions([
        {
            id: 1,
            name: "Partner",
            res_model: "partner",
            type: "ir.actions.act_window",
            views: [
                [false, "list"],
                [false, "form"],
            ],
        },
        {
            id: 2,
            name: "Other action",
            res_model: "partner",
            type: "ir.actions.act_window",
            views: [[false, "kanban"]],
        },
    ]);

    Partner._views = {
        list: `<tree><field name="name"/></tree>`,
        form: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        search: `<search/>`,
        kanban: `
            <kanban>
                <field name="name"/>
                <templates>
                    <t t-name="kanban-box">
                        <div></div>
                    </t>
                </templates>
            </kanban>
        `,
    };

    onRpc("web_save", ({ args }) => {
        expect.step("web_save");
        expect(args).toEqual([[1], { name: "aaa" }]);
    });

    await mountWithCleanup(WebClient);
    await getService("action").doAction(1);

    await contains(`.o_data_row td.o_data_cell`).click();
    expect(`.o_breadcrumb`).toHaveText("Partner\nXavier Lancer");

    await contains(`.o_field_widget[name='name'] input`).edit("aaa");
    await getService("action").doAction(2, { clearBreadcrumbs: true });
    expect.verifySteps(["web_save"]);

    expect(`.o_breadcrumb`).toHaveText("Other action");
    await getService("action").doAction(1, { clearBreadcrumbs: true });

    await contains(`.o_data_row td.o_data_cell`).click();
    expect(`.o_form_editable`).toHaveCount(1);
    expect(`.o_breadcrumb`).toHaveText("Partner\naaa");
    expect('.o_field_widget[name="name"] input').toHaveValue("aaa");
});

test(`save on closing tab/browser`, async () => {
    const sendBeaconDeferred = new Deferred();
    mockSendBeacon((_, blob) => {
        expect.step("sendBeacon");
        blob.text().then((r) => {
            const { params } = JSON.parse(r);
            if (params.method === "web_save" && params.model === "partner") {
                expect(params.args).toEqual([[1], { name: "test" }]);
            }
            sendBeaconDeferred.resolve();
        });
        return true;
    });

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        resId: 1,
    });

    expect(`.o_field_widget[name="name"] input`).not.toHaveValue("test");
    await contains(`.o_field_widget[name="name"] input`).edit("test");

    const [event] = unload();
    await sendBeaconDeferred;
    expect.verifySteps(["sendBeacon"]);
    expect(event.defaultPrevented).toBe(false);
});

test(`save on closing tab/browser (sendBeacon fails)`, async () => {
    mockSendBeacon(() => {
        expect.step("sendBeacon");
        return false;
    });

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        resId: 1,
    });

    expect(`.o_field_widget[name="name"] input`).not.toHaveValue("test");
    await contains(`.o_field_widget[name="name"] input`).edit("test");

    const [event] = unload();
    await animationFrame();
    expect.verifySteps(["sendBeacon"]);
    expect(event.defaultPrevented).toBe(true);
    expect(`.o_notification`).toHaveCount(1);

    await contains(`.o_form_button_save`).click();
    expect(`.o_notification`).toHaveCount(0);
});

test(`save on closing tab/browser (invalid field)`, async () => {
    mockSendBeacon(() => expect.step("sendBeacon"));
    onRpc("partner", "web_save", () => expect.step("save"));

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="name" required="1"/>
                </group>
            </form>
        `,
        resId: 1,
    });
    await contains(`.o_field_widget[name="name"] input`).edit("");
    const [event] = unload();
    await animationFrame();
    expect.verifySteps([]);
    expect(event.defaultPrevented).toBe(true);
    expect(`.o_notification`).toHaveCount(1);
});

test(`save on closing tab/browser (not dirty)`, async () => {
    mockSendBeacon(() => expect.step("sendBeacon"));
    onRpc("partner", "web_save", () => expect.step("save"));

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        resId: 1,
    });

    unload();
    await animationFrame();
    expect.verifySteps([]);
});

test(`save on closing tab/browser (not dirty but trailing spaces)`, async () => {
    Partner._fields.expertise = fields.Char({ trim: true });
    Partner._records[0].expertise = "name with trailing spaces   ";

    mockSendBeacon(() => {
        throw new Error("no write should be done");
    });
    onRpc(({ method }) => expect.step(method));

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="expertise"/></form>`,
        resId: 1,
    });
    expect.verifySteps(["get_views", "web_read"]);
    expect(`.o_field_widget[name=expertise] input`).toHaveValue("name with trailing spaces   ");

    unload();
    await animationFrame();
    expect.verifySteps([]);
});

test(`save on closing tab/browser (not dirty) with text field`, async () => {
    Partner._fields.information = fields.Text();

    mockSendBeacon(() => expect.step("sendBeacon"));
    onRpc("web_save", () => expect.step("save"));

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="information"/>
                </group>
            </form>
        `,
        resId: 1,
    });
    expect(`.o_field_widget[name=information] textarea`).toHaveValue("");

    unload();
    await animationFrame();
    expect.verifySteps([]);
});

test.tags("desktop")(`save on closing tab/browser (detached form)`, async () => {
    defineActions([
        {
            id: 1,
            name: "Partner",
            res_model: "partner",
            type: "ir.actions.act_window",
            views: [
                [false, "list"],
                [false, "form"],
            ],
        },
    ]);
    Partner._views = {
        list: `<tree><field name="name"/></tree>`,
        form: `
            <form>
                <group>
                    <field name="name"/>
                </group>
            </form>
        `,
        search: `<search/>`,
    };

    mockSendBeacon(() => expect.step("sendBeacon"));
    onRpc("web_save", () => expect.step("save"));

    await mountWithCleanup(WebClient);
    await getService("action").doAction(1);

    await contains(`.o_data_row td.o_data_cell`).click();
    expect(`.o_breadcrumb`).toHaveText("Partner\nXavier Lancer");

    await contains(`.o_back_button`).click();
    expect(`.o_breadcrumb`).toHaveText("Partner");

    unload();
    await animationFrame();
    expect.verifySteps([]);
});

test(`save on closing tab/browser (onchanges)`, async () => {
    Partner._onChanges = {
        expertise(record) {
            record.name = `copy: ${record.expertise}`;
        },
    };

    const sendBeaconDeferred = new Deferred();
    mockSendBeacon((_, blob) => {
        expect.step("sendBeacon");
        blob.text().then((r) => {
            const { params } = JSON.parse(r);
            if (params.method === "web_save" && params.model === "partner") {
                expect(params.args).toEqual([[1], { expertise: "test" }]);
            }
            sendBeaconDeferred.resolve();
        });
        return true;
    });

    const onchangeDeferred = new Deferred();
    onRpc("partner", "onchange", () => onchangeDeferred);

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="name"/>
                    <field name="expertise"/>
                </group>
            </form>
        `,
        resId: 1,
    });

    await contains(`.o_field_widget[name="expertise"] input`).edit("test", { confirm: "blur" });
    unload();
    await animationFrame();
    await sendBeaconDeferred;
    expect.verifySteps(["sendBeacon"]);
});

test(`save on closing tab/browser (onchanges 2)`, async () => {
    Partner._onChanges = {
        expertise() {},
    };

    const sendBeaconDeferred = new Deferred();
    mockSendBeacon((_, blob) => {
        expect.step("sendBeacon");
        blob.text().then((r) => {
            const { params } = JSON.parse(r);
            if (params.method === "web_save") {
                expect(params.args).toEqual([[1], { expertise: "test1", name: "test2" }]);
            }
            sendBeaconDeferred.resolve();
        });
        return true;
    });

    const onchangeDeferred = new Deferred();
    onRpc("partner", "onchange", () => onchangeDeferred);

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="expertise"/>
                    <field name="name"/>
                </group>
            </form>
        `,
        resId: 1,
    });

    await contains(`.o_field_widget[name="expertise"] input`).edit("test1", { confirm: "blur" });
    await contains(`.o_field_widget[name="name"] input`).edit("test2", { confirm: "blur" });

    unload();
    await animationFrame();
    await sendBeaconDeferred;
    expect.verifySteps(["sendBeacon"]);
});

test(`save on closing tab/browser (pending change)`, async () => {
    const sendBeaconDeferred = new Deferred();
    mockSendBeacon((_, blob) => {
        expect.step("sendBeacon");
        blob.text().then((r) => {
            const { params } = JSON.parse(r);
            if (params.method === "web_save") {
                expect(params.args).toEqual([[1], { expertise: "test" }]);
            }
            sendBeaconDeferred.resolve();
        });
        return true;
    });

    onRpc(({ method }) => expect.step(method));
    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="expertise"/></form>`,
        resId: 1,
    });
    expect.verifySteps(["get_views", "web_read"]);

    // edit 'expertise' but do not focusout -> the model isn't aware of the change
    // until the 'beforeunload' event is triggered
    await contains(`.o_field_widget[name="expertise"] input`).edit("test", { confirm: false });
    unload();
    await animationFrame();
    await sendBeaconDeferred;
    expect.verifySteps(["sendBeacon"]);
});

test(`save on closing tab/browser (onchanges + pending change)`, async () => {
    Partner._fields.unformatted_name = fields.Char();
    Partner._onChanges = {
        unformatted_name(record) {
            record.name = record.unformatted_name.toLowerCase().trim();
        },
    };

    const sendBeaconDeferred = new Deferred();
    mockSendBeacon((_, blob) => {
        expect.step("sendBeacon");
        blob.text().then((r) => {
            const { params } = JSON.parse(r);
            if (params.method === "web_save") {
                expect(params.args).toEqual([
                    [1],
                    { unformatted_name: "John Doe ", name: "john doe", expertise: "test" },
                ]);
            }
            sendBeaconDeferred.resolve();
        });
        return true;
    });

    const onchangeDeferred = new Deferred();
    onRpc("partner", "onchange", () => onchangeDeferred);
    onRpc(({ method }) => expect.step(method));

    await mountView({
        type: "form",
        resModel: "partner",
        arch: `
            <form>
                <field name="unformatted_name"/>
                <field name="name"/>
                <field name="expertise"/>
            </form>
        `,
        resId: 1,
    });
    expect.verifySteps(["get_views", "web_read"]);

    // edit 'unformatted_name' and simulate a focusout (trigger the 'change' event)
    await contains(`.o_field_widget[name="unformatted_name"] input`).edit("John Doe ", {
        confirm: "blur",
    });
    expect.verifySteps(["onchange"]);

    // edit 'name' and simulate a focusout (trigger the 'change' event)
    await contains(`.o_field_widget[name="name"] input`).edit("john doe", { confirm: "blur" });

    // edit 'expertise' but do not focusout -> the model isn't aware of the change
    // until the 'beforeunload' event is triggered
    await contains(`.o_field_widget[name="expertise"] input`).edit("test", { confirm: false });

    // trigger the 'beforeunload' event -> notifies the model directly and saves
    unload();
    await animationFrame();
    await sendBeaconDeferred;
    expect.verifySteps(["sendBeacon"]);
});

test(`save on closing tab/browser (invalid pending change)`, async () => {
    Partner._fields.age = fields.Integer();

    mockSendBeacon(() => expect.step("sendBeacon"));
    onRpc(({ method }) => expect.step(method));

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="age"/></form>`,
        resId: 1,
    });
    expect.verifySteps(["get_views", "web_read"]);

    // edit 'expertise' but do not focusout -> the model isn't aware of the change
    // until the 'beforeunload' event is triggered
    await contains(`.o_field_widget[name="age"] input`).edit("invalid value", { confirm: false });
    unload();
    await animationFrame();
    expect.verifySteps([]);
});

test(`save on closing tab/browser (onchanges + invalid field)`, async () => {
    Partner._onChanges = {
        expertise(record) {
            record.name = `copy: ${record.expertise}`;
        },
    };

    mockSendBeacon(() => expect.step("sendBeacon"));
    const onchangeDeferred = new Deferred();
    onRpc("partner", "onchange", () => onchangeDeferred);
    onRpc(({ method }) => expect.step(method));

    await mountView({
        resModel: "partner",
        type: "form",
        arch: `
            <form>
                <group>
                    <field name="expertise"/>
                    <field name="name" required="1"/>
                </group>
            </form>
        `,
        resId: 1,
    });
    expect.verifySteps(["get_views", "web_read"]);

    await contains(`.o_field_widget[name="expertise"] input`).edit("test", { confirm: "blur" });
    expect.verifySteps(["onchange"]);

    await contains(`.o_field_widget[name="name"] input`).edit("", { confirm: "blur" });
    unload();
    await animationFrame();
    expect.verifySteps([]);
});

test(`save when action button clicked`, async () => {
    onRpc("web_save", () => expect.step("save"));
    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="expertise"/></form>`,
        actionMenus: {},
        resId: 1,
    });
    expect(`.o_field_widget[name='expertise'] input`).toHaveValue("Sales");

    await contains(`.o_field_widget[name='expertise'] input`).edit("test");
    expect(`.o_pager_counter`).toHaveText("1 / 1");
    expect(`.o_field_widget[name='expertise'] input`).toHaveValue("test");

    await contains(`.o_cp_action_menus button`).click();
    await contains(`.o-dropdown--menu .dropdown-item`).click();
    expect.verifySteps(["save"]);
    expect(`.o_pager_counter`).toHaveText("2 / 2");
    expect(`.o_field_widget[name='expertise'] input`).toHaveValue("test");

    await contains(`.o_pager_previous`).click();
    expect(`.o_pager_counter`).toHaveText("1 / 2");
    expect(`.o_field_widget[name='expertise'] input`).toHaveValue("test");
});

test(`error on save when action button clicked`, async () => {
    onRpc("web_save", () => {
        expect.step("save");
        throw makeServerError();
    });
    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="expertise"/></form>`,
        actionMenus: {},
        resId: 1,
    });

    await contains(`.o_field_widget[name='expertise'] input`).edit("test");
    await contains(`.o_cp_action_menus button`).click();
    await contains(`.o-dropdown--menu .dropdown-item`).click();
    expect.verifySteps(["save"]);
    await animationFrame();
    expect(`.o_error_dialog`).toHaveCount(1);
});

test.tags("desktop")(`save when create button clicked`, async () => {
    onRpc("web_save", () => expect.step("save"));
    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="expertise"/></form>`,
        resId: 1,
    });
    expect(`.o_field_widget[name='expertise'] input`).toHaveValue("Sales");

    await contains(`.o_field_widget[name='expertise'] input`).edit("test");
    await contains(`.o_control_panel_main_buttons .o_form_button_create`).click();
    expect.verifySteps(["save"]);
    expect(`.o_field_widget[name='expertise'] input`).toHaveValue("Marketing");
    expect(`.o_breadcrumb .active`).toHaveText("New");
});

test(`error on save when create button clicked`, async () => {
    onRpc("web_save", () => {
        expect.step("save");
        throw makeServerError();
    });
    await mountView({
        resModel: "partner",
        type: "form",
        arch: `<form><field name="expertise"/></form>`,
        actionMenus: {},
        resId: 1,
    });

    await contains(`.o_field_widget[name='expertise'] input`).edit("test");
    await contains(`.o_form_button_create`).click();
    expect.verifySteps(["save"]);
    await animationFrame();
    expect(`.o_error_dialog`).toHaveCount(1);
});
