import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "re_dummy_key_for_compilation";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set in environment variables. Resend client will operate in mock/unauthenticated mode.");
}

export const resend = new Resend(resendApiKey);
export default resend;
