export function clickNextOrder() {
    return [
        {
            content: "go to next screen",
            trigger: ".receipt-screen .button.next.highlight[name='done']",
            mobile: false,
        },
        {
            content: "go to next screen",
            trigger: ".receipt-screen .btn-switchpane.validation-button.highlight[name='done']",
            mobile: true,
        },
    ];
}
export function clickContinueOrder() {
    return [
        {
            content: "go to next screen",
            trigger: ".receipt-screen .button.next.highlight[name='resume']",
        },
    ];
}
export function setEmail(email) {
    return [
        {
            trigger: ".receipt-screen .send-receipt-input input",
            run: `edit ${email}`,
        },
    ];
}
export function clickSend() {
    return [
        {
            trigger: `.receipt-screen .send-receipt-input div`,
        },
    ];
}
export function clickBack() {
    return [
        {
            trigger: ".receipt-screen .button.back",
        },
    ];
}

export function isShown() {
    return [
        {
            content: "receipt screen is shown",
            trigger: ".pos .receipt-screen",
            run: () => {},
        },
    ];
}
export function receiptIsThere() {
    return [
        {
            content: "there should be the receipt",
            trigger: ".receipt-screen .pos-receipt",
            run: () => {},
        },
    ];
}
export function totalAmountContains(value) {
    return [
        {
            trigger: `.receipt-screen .top-content h1:contains("${value}")`,
            run: () => {},
            mobile: false, // not rendered on mobile
        },
        {
            trigger: `.receipt-screen`,
            run: () => {},
            mobile: true, // On mobile, at least wait for the receipt screen to show
        },
    ];
}
export function emailIsSuccessful() {
    return [
        {
            trigger: `.receipt-screen .notice .text-success`,
            run: () => {},
        },
    ];
}
export function trackingMethodIsLot() {
    return [
        {
            content: `tracking method is Lot`,
            trigger: `li:contains("Lot Number")`,
            run: () => {},
        },
    ];
}
export function shippingDateExists() {
    return [
        {
            content: "Shipping date must be printed",
            trigger: ".pos-receipt-order-data:contains('Expected delivery:')",
        },
    ];
}
