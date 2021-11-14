import {
  ContributionTask,
  fetchContributions,
  nextProcessBlock,
} from "./query";
import { logger } from "./logger";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/submittable/types";
import { WHITELIST } from "./executor";
import Redis from "ioredis";
import userList from "./non-signed";
import dotenv from "dotenv";

dotenv.config();
const USER_BLACKLIST = userList.non_signed.map((row) => row.account);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const { PROXY_ACCOUNT_SEED, RELAY_ENDPINT } = process.env;

async function waitSubqueryIndexBlock(height: number) {
  while (true) {
    const nextBlockHeight = await nextProcessBlock();
    if (nextBlockHeight > height) {
      logger.info(`Block#${height} indexed.`);
      return;
    }
    logger.debug(
      `Waiting for subquery indexing ${height}, current: ${nextBlockHeight}`
    );
    await sleep(6000);
  }
}

export const redis = new Redis(process.env.REDIS_ENDPOINT, { password: "" });

async function main() {
  const provider = new WsProvider(RELAY_ENDPINT);

  provider.on("error", () => {
    logger.error("Websocket disconnect");
    process.exit(1);
  });

  logger.info(`Connect to ${RELAY_ENDPINT}`);
  const api = await ApiPromise.create({
    provider,
  });
  let keyring = new Keyring({ ss58Format: 2, type: "sr25519" });
  const signer = keyring.addFromUri(PROXY_ACCOUNT_SEED as string);

  if ((await redis.smembers("userBlackList")).length === 0) {
    await Promise.all(
      USER_BLACKLIST.map((record) => redis.sadd("userBlackList", record))
    );
  }

  const sendTxAndWaitTillFinalized = async (
    tx: SubmittableExtrinsic<"promise">,
    offset: number
  ) => {
    let nonce = await api.rpc.system.accountNextIndex(signer.address);
    return new Promise<number>((resolve) => {
      tx.signAndSend(
        signer,
        { nonce: nonce.toNumber() + offset },
        async ({ status }) => {
          if (status.isFinalized) {
            const {
              block: { header },
            } = await api.rpc.chain.getBlock(status.asFinalized.toHex());
            logger.info(`Calls finalized in Block#${header.number}`);
            return resolve(header.number.toNumber());
          }
        }
      );
    });
  };

  const { block } = await api.rpc.chain.getBlock();
  await waitSubqueryIndexBlock(block.header.number.toNumber());

  while (true) {
    const funds = await api.query.crowdloan.funds.entries();
    const keys = funds.map(([key, _]) => parseInt(key.args.toString()));
    logger.info(`Funds are ${keys}`);
    const availableTasks = (
      await Promise.all(
        keys
          .filter((k) => k in WHITELIST)
          .map(async (key) => await WHITELIST[key](api))
      )
    ).flat();

    if (availableTasks.length === 0) {
      await sleep(6000);
      continue;
    }

    const calls = availableTasks.map((tx, index) =>
      sendTxAndWaitTillFinalized(tx!!, index)
    );

    const callResults = (await Promise.all(calls)) as number[];
    const finalizedBlock = Math.max(...callResults);

    await waitSubqueryIndexBlock(finalizedBlock);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error(e.message);
    process.exit(1);
  });
