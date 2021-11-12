import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { ContributionTask, fetchContributions } from "../query";
import { moonbeamExecutor } from "./moonbeam";

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
  2002: moonbeamExecutor,
  2005: (api) => defaultExecutor(api, 2005),
};

// export const WHITELIST: { [paraId: number]: Executor } = {
//   2006: defaultExecutor,
//   2012: defaultExecutor,
//   2013: defaultExecutor,
//   2002: defaultExecutor,
//   2008: defaultExecutor,
//   2015: defaultExecutor,
//   2018: defaultExecutor,
// };
