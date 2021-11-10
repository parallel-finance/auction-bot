import { ApiPromise } from "@polkadot/api";
import type { ContributionTask } from "../query";

const defaultExecutor = async (api: ApiPromise, task: ContributionTask) => {
  return api.tx.utility.batchAll([
    api.tx.system.remark(task.id),
    api.tx.proxy.proxy(
      process.env.PROXIED_ACCOUNT as string,
      null,
      api.tx.crowdloan.contribute(task.paraId, task.amount, null)
    ),
  ]);
};

export const WHITELIST = {
  2006: defaultExecutor,
  2012: defaultExecutor,
  2013: defaultExecutor,
  2002: defaultExecutor,
  2008: defaultExecutor,
  2015: defaultExecutor,
  2018: defaultExecutor,
};
