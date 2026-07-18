// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./SignInForm";

const auth = vi.hoisted(() => ({ login: vi.fn(), completeMfa: vi.fn() }));
const security = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/contexts/LocaleContext", () => ({
  useTranslations: () => (key: string) => key
}));
vi.mock("@/services/AccountSecurityService", () => ({
  accountSecurityService: security
}));
vi.mock("@/components/security/TurnstileWidget", () => ({
  TurnstileWidget: () => null
}));

afterEach(() => cleanup());

beforeEach(() => {
  auth.login.mockReset();
  auth.completeMfa.mockReset();
  security.requestPasswordReset.mockReset();
});

describe("SignInForm account security", () => {
  it("holds the authenticated session until the MFA challenge succeeds", async () => {
    const onAuthenticated = vi.fn();
    auth.login.mockResolvedValue({ mfaRequired: true, challengeToken: "challenge-token" });
    auth.completeMfa.mockResolvedValue(undefined);
    render(<SignInForm onAuthenticated={onAuthenticated} />);

    await userEvent.type(screen.getByLabelText("workEmail"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("password"), "correct horse battery staple");
    await userEvent.click(screen.getByRole("button", { name: /signIn/ }));

    expect(await screen.findByText("mfaChallengeTitle")).toBeTruthy();
    expect(onAuthenticated).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("authenticatorCode"), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verifyAndContinue/ }));

    expect(auth.completeMfa).toHaveBeenCalledWith({
      challenge_token: "challenge-token",
      code: "123456"
    });
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it("supports a one-time recovery code instead of a TOTP code", async () => {
    auth.login.mockResolvedValue({ mfaRequired: true, challengeToken: "challenge-token" });
    auth.completeMfa.mockResolvedValue(undefined);
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText("workEmail"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("password"), "correct horse battery staple");
    await userEvent.click(screen.getByRole("button", { name: /signIn/ }));
    await userEvent.click(await screen.findByRole("button", { name: "useRecoveryCode" }));
    await userEvent.type(screen.getByLabelText("recoveryCode"), "ABCD-EFGH-IJKL");
    await userEvent.click(screen.getByRole("button", { name: /verifyAndContinue/ }));

    expect(auth.completeMfa).toHaveBeenCalledWith({
      challenge_token: "challenge-token",
      recovery_code: "ABCD-EFGH-IJKL"
    });
  });
});
