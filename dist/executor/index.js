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
exports.WHITELIST = void 0;
const logger_1 = require("../logger");
const query_1 = require("../query");
const nodle_1 = require("./nodle");
const darwinia_1 = require("./darwinia");
const interlay_1 = require("./interlay");
const centrifuge_1 = require("./centrifuge");
const equilibrium_1 = require("./equilibrium");
const defaultExecutor = (api, paraId, fetcher = query_1.fetchContributions) => __awaiter(void 0, void 0, void 0, function* () {
    const tasks = yield fetcher(paraId);
    return tasks.map((task) => {
        logger_1.logger.info(`Process tx of ${task.id}`);
        return api.tx.utility.batchAll([
            api.tx.system.remark(task.id),
            api.tx.proxy.proxy(process.env.PROXIED_ACCOUNT, null, api.tx.crowdloan.contribute(task.paraId, task.amount, null)),
        ]);
    });
});
const defaultExecutorFactory = (paraId, fetcher = query_1.fetchContributions) => (api) => defaultExecutor(api, paraId, fetcher);
const COINVERSATION = 2027;
const LITENTRY = 2013;
const PHALA = 2035;
const SUBGAME = 2017;
const HYDRADX = 2034;
exports.WHITELIST = {
    2002: defaultExecutorFactory(2002),
    2008: defaultExecutorFactory(2008),
    [darwinia_1.PARA_ID]: darwinia_1.darwiniaExecutor,
    [nodle_1.PARA_ID]: nodle_1.nodleExecutor,
    [interlay_1.PARA_ID]: interlay_1.interlayExecutor,
    [centrifuge_1.PARA_ID]: centrifuge_1.centrifugeExecutor,
    [equilibrium_1.PARA_ID]: equilibrium_1.equilibriumExecutor,
    [COINVERSATION]: defaultExecutorFactory(COINVERSATION),
    [LITENTRY]: defaultExecutorFactory(LITENTRY),
    [PHALA]: defaultExecutorFactory(PHALA),
    [SUBGAME]: defaultExecutorFactory(SUBGAME),
    [HYDRADX]: defaultExecutorFactory(HYDRADX),
};
