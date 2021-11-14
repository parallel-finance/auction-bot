import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";
import { moonbeamExecutor, PARA_ID as MOONBEAM } from "./moonbeam";
import { mantaExecutor, PARA_ID as MANTA } from "./manta";

export type Executor = typeof moonbeamExecutor;

const defaultExecutor = async (api: ApiPromise, paraId: number) => {
  const tasks = await fetchContributions(paraId);
  return tasks.map((task) => {
    logger.info(`Process tx of ${task.id}`);
    return api.tx.utility.batchAll([
      api.tx.system.remark(task.id),
      api.tx.proxy.proxy(
        process.env.PROXIED_ACCOUNT as string,
        null,
        api.tx.crowdloan.contribute(task.paraId, task.amount, null)
      ),
    ]);
  });
};

export const WHITELIST: { [paraId: number]: Executor } = {
  2004: moonbeamExecutor,
  2000: (api: ApiPromise) => defaultExecutor(api, 2000),
  2006: (api: ApiPromise) => defaultExecutor(api, 2006),
  2012: (api: ApiPromise) => defaultExecutor(api, 2012),
  2013: (api: ApiPromise) => defaultExecutor(api, 2013),
  2002: (api: ApiPromise) => defaultExecutor(api, 2002),
  2008: (api: ApiPromise) => defaultExecutor(api, 2008),
  2015: mantaExecutor,
  2018: (api: ApiPromise) => defaultExecutor(api, 2018),
};
