import {
  Text,
  SafeAreaView,
  StyleSheet,
  Pressable,
  ScrollView,
  View,
} from "react-native";

// Import necessary modules
import { S3 } from "@aws-sdk/client-s3";

import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { Buffer } from "buffer";
import { useState } from "react";

// Ensure the Buffer is available globally
global.Buffer = Buffer;

const DATABASE_NAME = "data.db";
const DATABASE_URI = FileSystem.documentDirectory + "SQLite/" + DATABASE_NAME;

let loadedDatabase = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (loadedDatabase) {
    return loadedDatabase;
  }

  if (!(await FileSystem.getInfoAsync(DATABASE_URI)).exists) {
    throw new Error("Database does not exist");
  }
  loadedDatabase = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return loadedDatabase;
}

export async function downloadDatabase() {
  // download DB file from Github and store it locally
  console.log(
    "Downloading ",
    process.env.EXPO_PUBLIC_GITHUB_DB_URL,
    " to ",
    DATABASE_URI
  );
  try {
    const { uri } = await FileSystem.downloadAsync(
      process.env.EXPO_PUBLIC_GITHUB_DB_URL,
      DATABASE_URI
    );
    console.log("Finished downloading to ", uri);
  } catch (error) {
    console.error(error);
  }

  // open the database
  loadedDatabase = getDatabase();
}
