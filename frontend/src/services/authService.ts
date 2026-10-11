export type Session = {
    email: string;
    // true while auth is a local placeholder and nothing was verified
    mock: boolean;
};

// TODO: replace with a call to the Spring backend. This placeholder does NOT verify credentials;
// it accepts any well-formed input so the rest of the app can be built against a session.
export async function signIn(email: string, password: string): Promise<Session> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (!email || !password) throw new Error("Enter your email and password.");
    return { email, mock: true };
}
