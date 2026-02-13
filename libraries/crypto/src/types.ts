export type HashAlgorithm = "sha256" | "sha384" | "sha512";

export type Pkcs12Result = {
  certificate: Uint8Array; // DER-encoded X.509 cert
  privateKey: Uint8Array; // DER-encoded private key
  chain: Uint8Array[]; // CA certs in chain
};

export type CmsAttribute = {
  oid: string;
  values: Uint8Array[]; // DER-encoded attribute values
};

export type SignedDataOptions = {
  content: Uint8Array;
  certificate: Uint8Array;
  privateKey: Uint8Array;
  chain?: Uint8Array[];
  hashAlgorithm?: HashAlgorithm;
  authenticatedAttributes?: CmsAttribute[];
  unauthenticatedAttributes?: CmsAttribute[];
  detached?: boolean;
};
