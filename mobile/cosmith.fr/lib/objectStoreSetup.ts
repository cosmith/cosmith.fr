import * as FileSystem from "expo-file-system";

// polyfills needed for S3
import "react-native-get-random-values";
import { ReadableStream } from "web-streams-polyfill";
globalThis.ReadableStream = ReadableStream;

import { S3 } from "@aws-sdk/client-s3";

import { Buffer } from "buffer";

const BUCKET_NAME = "cosmith";

// Ensure the Buffer is available globally
global.Buffer = Buffer;

// Configure S3 client
const config = {
  region: "auto",
  endpoint: process.env.EXPO_PUBLIC_OBJECT_STORE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.EXPO_PUBLIC_OBJECT_STORE_ACCESS_KEY_ID,
    secretAccessKey: process.env.EXPO_PUBLIC_OBJECT_STORE_SECRET_ACCESS_KEY,
  },
};
const s3 = new S3(config);

export async function uploadFile(fileUri, key, mimeType) {
  try {
    // Read the file as a b64 string
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const blob = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload the file
    const data = await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: Buffer.from(blob, "base64"),
    });

    console.log("File uploaded successfully:", data);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}
