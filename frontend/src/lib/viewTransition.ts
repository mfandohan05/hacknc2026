import { flushSync } from "react-dom";

type StartViewTransition = (update: () => void) => { finished: Promise<unknown> };
let latestTransition = 0;

export function runViewTransition(update: () => void, kind = "overlay") {
    const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!start || reduceMotion) {
        update();
        return;
    }

    const transitionId = ++latestTransition;
    document.documentElement.dataset.vt = kind;
    const transition = start.call(document, () => flushSync(update));
    const cleanup = () => {
        if (transitionId === latestTransition) delete document.documentElement.dataset.vt;
    };
    void transition.finished.then(cleanup, cleanup);
}
