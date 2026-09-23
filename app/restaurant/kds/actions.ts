/**
 * `/restaurant/kds` was the baseline duplicate of the kitchen board; the screen now lives at `/restaurant/kitchen`
 * (frontend.md §2) and this module only re-exports its actions so existing imports keep resolving. Nothing new should
 * import from here — use `@/app/restaurant/kitchen/actions`.
 */
export { getKOTTicketsAction, getKitchenSectionsAction, updateKOTStatusAction } from "../kitchen/actions";
