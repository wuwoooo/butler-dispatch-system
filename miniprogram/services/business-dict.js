"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessDictItems = getBusinessDictItems;
const request_1 = require("./request");
function getBusinessDictItems(dictType) {
    return request_1.http.get(`/api/mobile/business-dicts${(0, request_1.buildQuery)({ dictType })}`, { loading: false });
}
