import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { analyzeAddressStub, UserInputError } from "./analyze";

export const analyzeAddress = onCall({ region: "us-central1" }, (request) => {
  try {
    const result = analyzeAddressStub((request.data as { address?: unknown } | undefined)?.address);
    logger.info("analyzeAddress stub ok", { analysisId: result.analysisId });
    return result;
  } catch (e) {
    if (e instanceof UserInputError) throw new HttpsError("invalid-argument", e.message);
    logger.error("analyzeAddress failed", { error: e instanceof Error ? e.message : "unknown" });
    throw new HttpsError("internal", "Something went wrong. Please try again.");
  }
});
