import { fetchContributions, nextProcessBlock } from "./query";
import { logger } from "./logger";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/submittable/types";
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
    tx: SubmittableExtrinsic<"promise">
  ) => {
    let nonce = await api.rpc.system.accountNextIndex(signer.address);

    return new Promise<number>((resolve) => {
      tx.signAndSend(signer, { nonce }, async ({ status }) => {
        if (status.isFinalized) {
          const {
            block: { header },
          } = await api.rpc.chain.getBlock(status.asFinalized.toHex());
          logger.info(`Calls finalized in Block#${header.number}`);
          return resolve(header.number.toNumber());
        }
      });
    });
  };

  while (true) {
    const result = await fetchContributions();
    if (!result) {
      await sleep(6000);
      continue;
    }

    let [tasks, first, last] = result;
    logger.info(`Fetched task during block#[${first}, ${last}]`);

    let calls = [
      api.tx.system.remark(`${first}:${last}`),
      ...tasks.map((t) =>
        api.tx.crowdloan.contribute(t.paraId, t.amount, null)
      ),
    ];

    logger.info(`Signer addr: ${signer.address.toString()}`);

    const finalizedBlock = await sendTxAndWaitTillFinalized(
      api.tx.proxy.proxy(
        PROXIED_ACCOUNT as string,
        null,
        api.tx.utility.batchAll(calls)
      )
    );
    await waitSubqueryIndexBlock(finalizedBlock);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error(e.message);
    process.exit(1);
  });
