import { ESILevel } from "./types";

export const APP_NAME = "AegisCare";

export const ESI_COLORS = {
  [ESILevel.ONE]: "bg-red-600 text-white border-red-700",
  [ESILevel.TWO]: "bg-orange-600 text-white border-orange-700",
  [ESILevel.THREE]: "bg-yellow-500 text-black border-yellow-600",
  [ESILevel.FOUR]: "bg-blue-500 text-white border-blue-600",
  [ESILevel.FIVE]: "bg-green-500 text-white border-green-600",
};

export const ESI_DESCRIPTIONS = {
  [ESILevel.ONE]: "Resuscitation - Immediate Life Saving Intervention",
  [ESILevel.TWO]: "Emergent - High risk, confused/lethargic, severe pain",
  [ESILevel.THREE]: "Urgent - Needs multiple resources, vitals stable",
  [ESILevel.FOUR]: "Less Urgent - Needs one resource",
  [ESILevel.FIVE]: "Non-urgent - No resources needed",
};

export const DISCLAIMER_TEXT = "AegisCare is a Clinical Decision Support tool. It is NOT a doctor. All AI suggestions must be reviewed by qualified medical personnel.";

export const GEMINI_MODEL = "gemini-3-pro-preview"; // Using the reasoning model for complex SBAR