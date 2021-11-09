import {
  ContributionTask,
  fetchContributions,
  nextProcessBlock,
} from "./query";
import { logger } from "./logger";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/submittable/types";
import { WHITELIST } from "./executor";
import dotenv from "dotenv";
dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const { PROXIED_ACCOUNT, PROXY_ACCOUNT_SEED, RELAY_ENDPINT } = process.env;

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

async function main() {
  const provider = new WsProvider(RELAY_ENDPINT);
  logger.info(`Connect to ${RELAY_ENDPINT}`);
  const api = await ApiPromise.create({
    provider,
  });
  let keyring = new Keyring({ ss58Format: 2, type: "sr25519" });
  const signer = keyring.addFromUri(PROXY_ACCOUNT_SEED as string);

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
    if (!api.isConnected) {
      logger.error("Websocket connection is broken");
      process.exit(1);
    }
    const funds = await api.query.crowdloan.funds.entries();
    const keys = funds.map(([key, _]) => parseInt(key.args.toString()));
    logger.info(`Funds are ${keys}`);
    const availableTasks = await Promise.all(
      keys
        .filter((k) => k in WHITELIST)
        .map(async (key) => await fetchContributions(key))
    );

    const result: ContributionTask[] = availableTasks.flat()!!;
    if (!result || result.length == 0) {
      await sleep(6000);
      continue;
    }

    const calls = result.map((t, index) => {
      logger.info(`Process tx with ${t.id}`);
      const txs = WHITELIST[t.paraId](t);
      return sendTxAndWaitTillFinalized(txs, index);
    });

    const callResults = await Promise.all(calls);
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
