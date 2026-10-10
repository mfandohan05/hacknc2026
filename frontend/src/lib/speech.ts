const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function unlockSpeech(text?: string) {
    if (!supported()) return;
    const utterance = new SpeechSynthesisUtterance(text ?? " ");
    if (!text) utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
}

export function speak(text: string) {
    if (!supported()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
    if (!supported()) return;
    window.speechSynthesis.cancel();
}
