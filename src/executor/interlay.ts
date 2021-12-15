import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";

export const PARA_ID = 2032;

export const interlayExecutor = async (api: ApiPromise) => {
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
        api.tx.crowdloan.addMemo(
          task.paraId,
          "0x1ab3fcef9dedbd3495ffb1123de9ef36fcd234d2682ab0ae910ab7ff70400b35"
        )
      ),
    ]);
  });
};
