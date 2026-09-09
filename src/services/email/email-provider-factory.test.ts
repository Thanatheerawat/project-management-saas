import { describe, expect, it } from "vitest";

import { createEmailProvider } from "@/services/email/email-provider-factory";
import { MockEmailProvider } from "@/services/email/mock-email-provider";
import { ResendEmailProvider } from "@/services/email/resend-email-provider";

describe("createEmailProvider", () => {
  it("returns a MockEmailProvider instance when type is 'mock'", () => {
    const provider = createEmailProvider("mock");
    expect(provider).toBeInstanceOf(MockEmailProvider);
  });

  it("returns a ResendEmailProvider instance when type is 'resend' and valid config is given", () => {
    const provider = createEmailProvider("resend", {
      resendApiKey: "fake-test-key",
      emailFrom: "Orbit <from@x.com>",
    });
    expect(provider).toBeInstanceOf(ResendEmailProvider);
  });

  it("propagates ResendEmailProvider's own error when no API key is given for 'resend'", () => {
    expect(() => createEmailProvider("resend", { emailFrom: "from@x.com" })).toThrow(
      /non-empty API key/i,
    );
  });

  it("propagates ResendEmailProvider's own error when no from address is given for 'resend'", () => {
    expect(() => createEmailProvider("resend", { resendApiKey: "key" })).toThrow(
      /non-empty from address/i,
    );
  });

  it("propagates ResendEmailProvider's own error when neither credential is given for 'resend'", () => {
    expect(() => createEmailProvider("resend", {})).toThrow(/non-empty API key/i);
  });
});
