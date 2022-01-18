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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moonbeamExecutor = exports.PARA_ID = void 0;
const graphql_request_1 = require("graphql-request");
const uuid_1 = require("uuid");
const logger_1 = require("../logger");
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../index");
exports.PARA_ID = 2004;
const checkIfSinged = (task) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.debug(`Check remark of ${task.account}`);
    const res = yield axios_1.default
        .get(`${process.env.SIGNATURE_ENDPOINT}/check-remark/${task.account}`, {
        headers: {
            "X-API-KEY": process.env.MOONBEAM_API_KEY,
            "Content-Type": "application/json; charset=utf-8",
        },
    })
        .catch((err) => err.response);
    if (!res || res.status !== 200) {
        logger_1.logger.error(!res ? "Connect failed" : `Request failed: ${JSON.stringify(res.data)}`);
        return;
    }
    const { verified } = res.data;
    return verified;
});
const makeSignature = (api, task) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.debug(`Fetch signature of ${task.id}`);
    let { moonbeanContributions: { nodes: [result], }, } = yield (0, graphql_request_1.request)(process.env.GRAPHQL_ENDPOINT, (0, graphql_request_1.gql) `
      query {
        moonbeanContributions(
          filter: {
            id: { equalTo: "${exports.PARA_ID}" }
          }
        ) {
          nodes {
            amount
          }
        }
      }
    `);
    let amount = result ? result.amount : "0";
    const guid = (0, uuid_1.v4)();
    const blockHash = yield api.rpc.chain.getBlockHash(task.blockHeight);
    const payload = {
        "lp-address": process.env.PROXIED_ACCOUNT,
        "lp-previous-total-contribution": amount,
        "lp-contribution": task.amount,
        guid,
        contributor: {
            "deposit-hash": task.id,
            "finalized-block": blockHash.toHex(),
            "contrib-address": task.account,
        },
    };
    logger_1.logger.debug(`Make signature with payload: ${JSON.stringify(payload)}`);
    const res = yield axios_1.default
        .post(`${process.env.SIGNATURE_ENDPOINT}/make-signature-lp`, payload, {
        headers: {
            "X-API-KEY": process.env.MOONBEAM_API_KEY,
            "Content-Type": "application/json; charset=utf-8",
        },
    })
        .catch((err) => err.response);
    if (!res || res.status !== 200) {
        logger_1.logger.error(!res ? "Connect failed" : `Request failed: ${JSON.stringify(res.data)}`);
        return;
    }
    const { signature } = res.data;
    logger_1.logger.info("Get signature: " + signature);
    return signature;
});
function fetchContributions() {
    return __awaiter(this, void 0, void 0, function* () {
        const { dotContributions: { nodes }, } = yield (0, graphql_request_1.request)(process.env.GRAPHQL_ENDPOINT, (0, graphql_request_1.gql) `
      query {
        dotContributions(
          filter: {
            transactionExecuted: { equalTo: false }
            paraId: { equalTo: ${exports.PARA_ID} }
          }
        ) {
          nodes {
            id
            blockHeight
            paraId
            account
            amount
          }
        }
      }
    `);
        const tasks = nodes.sort((a, b) => BigInt(a.amount) > BigInt(b.amount) ? -1 : 1);
        const takeFirstSigned = () => __awaiter(this, void 0, void 0, function* () {
            for (const task of tasks) {
                if (yield index_1.redis.sismember("userBlackList", task.account)) {
                    continue;
                }
                const result = yield checkIfSinged(task);
                if (typeof result === "undefined") {
                    continue;
                }
                if (!result) {
                    logger_1.logger.info(`Add ${task.account} to blacklist`);
                    yield index_1.redis.sadd("userBlackList", task.account);
                    continue;
                }
                return task;
            }
        });
        const task = yield takeFirstSigned();
        logger_1.logger.info(`Process moonbean task: ${JSON.stringify(task)}`);
        return !task ? [] : [task];
    });
}
const moonbeamExecutor = (api) => __awaiter(void 0, void 0, void 0, function* () {
    const tasks = yield fetchContributions();
    return (yield Promise.all(tasks.map((task) => __awaiter(void 0, void 0, void 0, function* () {
        logger_1.logger.info(`Process tx of ${task.id}`);
        const signature = yield makeSignature(api, task);
        if (!signature) {
            return null;
        }
        return api.tx.utility.batchAll([
            api.tx.system.remark(task.id),
            api.tx.proxy.proxy(process.env.PROXIED_ACCOUNT, null, api.tx.crowdloan.contribute(task.paraId, task.amount, {
                sr25519: signature,
            })),
            api.tx.proxy.proxy(process.env.PROXIED_ACCOUNT, null, api.tx.crowdloan.addMemo(task.paraId, "0x508eb96dc541c8E88A8A3fce4618B5fB9fA3f209")),
        ]);
    })))).filter((e) => !!e);
});
exports.moonbeamExecutor = moonbeamExecutor;
