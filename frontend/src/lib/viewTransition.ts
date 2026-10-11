import { flushSync } from "react-dom";

type StartViewTransition = (update: () => void) => { finished: Promise<unknown> };

// Runs a state update inside a view transition so elements sharing a view-transition-name morph
// between their old and new positions. `kind` lets the CSS pick the animation (html[data-vt]).
// Falls back to a plain update where View Transitions aren't available or motion is reduced.
export function runViewTransition(update: () => void, kind = "overlay") {
    const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!start || reduceMotion) {
        update();
        return;
    }

    document.documentElement.dataset.vt = kind;
    const transition = start.call(document, () => flushSync(update));
    void transition.finished.finally(() => {
        delete document.documentElement.dataset.vt;
    });
}
