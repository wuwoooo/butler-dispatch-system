"use strict";
Component({
    options: { multipleSlots: true },
    properties: {
        label: { type: String, value: "" },
        desc: { type: String, value: "" },
        required: { type: Boolean, value: false },
        error: { type: Boolean, value: false },
        errorMessage: { type: String, value: "" },
        disabled: { type: Boolean, value: false }
    }
});
