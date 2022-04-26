import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";
import { mantaExecutor, PARA_ID as MANTA } from "./manta";

export type Executor = typeof mantaExecutor;
export type Fetcher = typeof fetchContributions;

const defaultExecutor = async (
  api: ApiPromise,
  paraId: number,
  fetcher: Fetcher = fetchContributions
) => {
  const tasks = await fetcher(paraId);
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

const defaultExecutorFactory =
  (paraId: number, fetcher: Fetcher = fetchContributions) =>
  (api: ApiPromise) =>
    defaultExecutor(api, paraId, fetcher);

export const WHITELIST: { [paraId: number]: Executor } = {
  2030: defaultExecutorFactory(2030),
  2038: defaultExecutorFactory(2038),
  2040: defaultExecutorFactory(2040),
  2027: defaultExecutorFactory(2027),
  2043: defaultExecutorFactory(2043),
};
