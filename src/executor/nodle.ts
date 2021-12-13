import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";

export const PARA_ID = 2026;

export const nodleExecutor = async (api: ApiPromise) => {
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
          "0x9a6d8b9ce3536600ca5e3235162058682c565f1b7c071d00bff49acfc7489e3f"
        )
      ),
    ]);
  });
};
