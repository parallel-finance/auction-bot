import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";

export const PARA_ID = 2011;

export const equilibriumExecutor = async (api: ApiPromise) => {
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
          "0x9ebc94ca272fc936ff8870a70ec9aa7cac25ecb5e428d14842f1e89b092f507c"
        )
      ),
    ]);
  });
};
