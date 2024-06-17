import { Stack, router, useLocalSearchParams } from "expo-router";

import { ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { useContext, useState } from "react";
import { Screen } from "../../../../components/Screen";
import { createUpdate } from "../../../../lib/database";
import { DatabaseUpdatedContext } from "../../../../lib/DatabaseUpdatedContext";

export default function Project() {
  const { projectId } = useLocalSearchParams();
  const [content, setContent] = useState("");
  const { setDatabaseUpdated } = useContext(DatabaseUpdatedContext);

  return (
    <>
      <Stack.Screen
        options={{
          title: "New update",
          headerRight: () => {
            return (
              <TouchableOpacity
                style={{ padding: 10 }}
                onPress={async () => {
                  await createUpdate(projectId, content);
                  setDatabaseUpdated(true);
                  router.back();
                }}
              >
                <Text>Save</Text>
              </TouchableOpacity>
            );
          },
        }}
      />
      <Screen>
        <ScrollView>
          <TextInput
            value={content}
            onChangeText={(text) => setContent(text)}
            multiline
            autoFocus
          />
        </ScrollView>
      </Screen>
    </>
  );
}
