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
const query_1 = require("./query");
const logger_1 = require("./logger");
const api_1 = require("@polkadot/api");
const executor_1 = require("./executor");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { PROXY_ACCOUNT_SEED, RELAY_ENDPINT } = process.env;
function waitSubqueryIndexBlock(height) {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            const nextBlockHeight = yield (0, query_1.nextProcessBlock)();
            if (nextBlockHeight > height) {
                logger_1.logger.info(`Block#${height} indexed.`);
                return;
            }
            logger_1.logger.debug(`Waiting for subquery indexing ${height}, current: ${nextBlockHeight}`);
            yield sleep(6000);
        }
    });
}
// export const redis = new Redis(process.env.REDIS_ENDPOINT, { password: "" });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = new api_1.WsProvider(RELAY_ENDPINT);
        provider.on("error", () => {
            logger_1.logger.error("Websocket disconnect");
            process.exit(1);
        });
        logger_1.logger.info(`Connect to ${RELAY_ENDPINT}`);
        const api = yield api_1.ApiPromise.create({
            provider,
        });
        let keyring = new api_1.Keyring({ ss58Format: 2, type: "sr25519" });
        const signer = keyring.addFromUri(PROXY_ACCOUNT_SEED);
        const sendTxAndWaitTillFinalized = (tx, offset) => __awaiter(this, void 0, void 0, function* () {
            let nonce = yield api.rpc.system.accountNextIndex(signer.address);
            return new Promise((resolve) => {
                tx.signAndSend(signer, { nonce: nonce.toNumber() + offset }, ({ status }) => __awaiter(this, void 0, void 0, function* () {
                    if (status.isFinalized) {
                        const { block: { header }, } = yield api.rpc.chain.getBlock(status.asFinalized.toHex());
                        logger_1.logger.info(`Calls finalized in Block#${header.number}`);
                        return resolve(header.number.toNumber());
                    }
                }));
            });
        });
        const { block } = yield api.rpc.chain.getBlock();
        yield waitSubqueryIndexBlock(block.header.number.toNumber());
        while (true) {
            const funds = yield api.query.crowdloan.funds.entries();
            const { block } = yield api.rpc.chain.getBlock();
            // Check if in vrf
            const auctionInfo = (yield api.query.auctions.auctionInfo());
            const isInVrf = auctionInfo.isSome &&
                auctionInfo.unwrap()[1].toNumber() + 72000 <
                    block.header.number.toNumber();
            if (isInVrf) {
                yield sleep(6000);
                continue;
            }
            const keys = funds
                .map(([key, val]) => {
                return [parseInt(key.args.toString()), val.toJSON()["end"]];
            })
                .filter(([_, endBlock]) => endBlock > block.header.number.toNumber())
                .map(([key, _]) => key);
            logger_1.logger.info(`Funds are ${keys}`);
            const availableTasks = (yield Promise.all(keys
                .filter((k) => k in executor_1.WHITELIST)
                .map((key) => __awaiter(this, void 0, void 0, function* () { return yield executor_1.WHITELIST[key](api); })))).flat();
            if (availableTasks.length === 0) {
                yield sleep(6000);
                continue;
            }
            const calls = availableTasks.map((tx, index) => sendTxAndWaitTillFinalized(tx, index));
            const callResults = (yield Promise.all(calls));
            const finalizedBlock = Math.max(...callResults);
            yield waitSubqueryIndexBlock(finalizedBlock);
        }
    });
}
main()
    .then(() => process.exit(0))
    .catch((e) => {
    logger_1.logger.error(e.message);
    process.exit(1);
});
