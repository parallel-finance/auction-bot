import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";

export const PARA_ID = 2031;

export const centrifugeExecutor = async (api: ApiPromise) => {
  const tasks = await fetchContributions(PARA_ID);
  return tasks.map((task) => {
    logger.info(`Process tx of ${task.id}`);
    return api.tx.utility.batchAll([
      api.tx.system.remark(task.id),
      api.tx.proxy.proxy(
        process.env.PROXIED_ACCOUNT as string,
        null,
        api.tx.crowdloan.contribute(task.paraId, task.amount, null)
      ),
      api.tx.proxy.proxy(
        process.env.PROXIED_ACCOUNT as string,
        null,
        api.tx.crowdloan.addMemo(task.paraId, "OV9NsSWu9B3bX3XH3M17")
      ),
    ]);
  });
};
