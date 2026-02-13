export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QrCodeOptions = {
  size?: number;
  errorCorrection?: ErrorCorrectionLevel;
  margin?: number;
};
