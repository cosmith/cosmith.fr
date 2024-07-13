import { Stack } from "expo-router/stack";
import React, { useEffect } from "react";
import { TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { DatabaseUpdatedContext } from "../lib/DatabaseUpdatedContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerWebsiteUpdate, uploadDatabase } from "../lib/upload";

function App() {
  const { databaseUpdated, setDatabaseUpdated } = React.useContext(
    DatabaseUpdatedContext
  );

  const onSavePress = async () => {
    try {
      await uploadDatabase();
    } catch (error) {
      console.error("Error uploading database:", error);
    }
    console.log("Database saved");

    try {
      await triggerWebsiteUpdate();
    } catch (error) {
      console.error("Error triggering website update:", error);
    }

    await setDatabaseUpdated(false);
    console.log("Database updated false");
  };

  return (
    <>
      <Stack />
      {databaseUpdated ? (
        <View style={styles.dbUpdatedContainer}>
          <Text>Unsaved updates</Text>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.button} onPress={() => {}}>
              <Text style={[styles.buttonText, { color: "red" }]}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={onSavePress}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </>
  );
}

export default function Layout() {
  const [databaseUpdated, setDatabaseUpdatedValue] = React.useState(null);
  async function setDatabaseUpdated(value: boolean) {
    setDatabaseUpdatedValue(value);
    await AsyncStorage.setItem("databaseUpdated", value.toString());
  }

  useEffect(() => {
    async function getDatabaseUpdated() {
      const value = await AsyncStorage.getItem("databaseUpdated");
      setDatabaseUpdatedValue(value === "true");
    }
    getDatabaseUpdated();
  }, []);

  if (databaseUpdated === null) {
    return null;
  }

  return (
    <DatabaseUpdatedContext.Provider
      value={{ databaseUpdated, setDatabaseUpdated }}
    >
      <App />
    </DatabaseUpdatedContext.Provider>
  );
}

const styles = StyleSheet.create({
  dbUpdatedContainer: {
    height: 100,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffe",
  },
  buttonsContainer: {
    flexDirection: "row",
  },
  button: {
    flex: 1,
    margin: 10,
  },
  buttonText: {
    fontSize: 16,
    padding: 10,
    textAlign: "center",
  },
});
