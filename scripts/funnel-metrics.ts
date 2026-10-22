/* Prints real aggregate funnel counts (no personal data). Usage: npm run metrics */
import { funnelMetrics } from "../src/lib/early-access";
import { playMetrics } from "../src/lib/game-service";
import { scriptCtx } from "./_ctx";

const { store } = scriptCtx();
Promise.all([funnelMetrics(store), playMetrics(store)]).then(([f, p]) => console.log(JSON.stringify({ ...f, ...p }, null, 2)));
