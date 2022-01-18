"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.centrifugeExecutor = exports.PARA_ID = void 0;
const logger_1 = require("../logger");
const query_1 = require("../query");
exports.PARA_ID = 2031;
const centrifugeExecutor = (api) => __awaiter(void 0, void 0, void 0, function* () {
    const tasks = yield (0, query_1.fetchContributions)(exports.PARA_ID);
    return tasks.map((task) => {
        logger_1.logger.info(`Process tx of ${task.id}`);
        return api.tx.utility.batchAll([
            api.tx.system.remark(task.id),
            api.tx.proxy.proxy(process.env.PROXIED_ACCOUNT, null, api.tx.crowdloan.contribute(task.paraId, task.amount, null)),
            api.tx.proxy.proxy(process.env.PROXIED_ACCOUNT, null, api.tx.crowdloan.addMemo(task.paraId, "OV9NsSWu9B3bX3XH3M17")),
        ]);
    });
});
exports.centrifugeExecutor = centrifugeExecutor;
