import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";
import { mantaExecutor, PARA_ID as MANTA } from "./manta";
import { nodleExecutor, PARA_ID as NODLE } from "./nodle";
import { darwiniaExecutor, PARA_ID as DARWINIA } from "./darwinia";
import { interlayExecutor, PARA_ID as INTERLAY } from "./interlay";
import { centrifugeExecutor, PARA_ID as CENTRIFUGE } from "./centrifuge";

export type Executor = typeof mantaExecutor;

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

const defaultExecutorFactory = (paraId: number) => (api: ApiPromise) =>
  defaultExecutor(api, paraId);

const COMPOSABLE = 2019;

export const WHITELIST: { [paraId: number]: Executor } = {
  2013: (api) => defaultExecutor(api, 2013),
  2002: (api) => defaultExecutor(api, 2002),
  2008: (api) => defaultExecutor(api, 2008),
  2017: (api) => defaultExecutor(api, 2017),
  [MANTA]: mantaExecutor,
  2018: (api) => defaultExecutor(api, 2018),
  2028: (api) => defaultExecutor(api, 2028),
  [DARWINIA]: darwiniaExecutor,
  2021: (api) => defaultExecutor(api, 2021),
  [NODLE]: nodleExecutor,
  [COMPOSABLE]: defaultExecutorFactory(COMPOSABLE),
  [INTERLAY]: interlayExecutor,
  [CENTRIFUGE]: centrifugeExecutor,
};
