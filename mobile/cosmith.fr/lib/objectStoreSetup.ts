import { S3 } from "@aws-sdk/client-s3";

import { Buffer } from "buffer";

// Ensure the Buffer is available globally
global.Buffer = Buffer;

// Configure S3 client
const s3 = new S3({
  region: "auto",
  endpoint: process.env.EXPO_PUBLIC_OBJECT_STORE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.EXPO_PUBLIC_OBJECT_STORE_ACCESS_KEY_ID,
    secretAccessKey: process.env.EXPO_PUBLIC_OBJECT_STORE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const uploadFile = async (fileUri, bucketName, key) => {
  try {
    // Read the file as a binary buffer
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    const params = {
      Bucket: bucketName, // Replace with your bucket name
      Key: key, // Replace with the desired key (file name) in the bucket
      Body: Buffer.from(buffer),
      ContentType: blob.type,
    };

    // Upload the file
    const data = await s3.putObject(params);
    console.log("File uploaded successfully:", data.Location);
    return data.Location;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

function createFile() {
  const content = "This is a sample string content to be uploaded as a file.";
  const bucketName = "cosmith";
  const key = "your-desired-file-name.txt";

  uploadFile(content, bucketName, key)
    .then((location) => console.log("File uploaded to:", location))
    .catch((error) => console.error("Upload failed:", error));
}
