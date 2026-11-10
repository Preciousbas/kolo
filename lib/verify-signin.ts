import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

export async function verifySignInMessage(args: {
  message: string;
  signature: string;
  address: string;
}): Promise<boolean> {
  try {
    const bytes = new TextEncoder().encode(args.message);
    await verifyPersonalMessageSignature(bytes, args.signature, { address: args.address });
    return true;
  } catch {
    return false;
  }
}
