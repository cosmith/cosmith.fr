import { Stack, router, useLocalSearchParams } from "expo-router";

import { ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { getUpdate, updateUpdate } from "../../../../lib/database";
import { useContext, useEffect, useState } from "react";
import { Screen } from "../../../../components/Screen";
import { DatabaseUpdatedContext } from "../../../../lib/DatabaseUpdatedContext";

export default function Project() {
  const { updateId } = useLocalSearchParams();
  const [update, setUpdate] = useState(null);
  const [content, setContent] = useState("");

  const { setDatabaseUpdated } = useContext(DatabaseUpdatedContext);

  useEffect(() => {
    const fetchData = async () => {
      const update = await getUpdate(updateId);
      setUpdate(update);
      setContent(update.content);
    };

    fetchData();
  }, [updateId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: update?.created_at ?? "Loading...",
          headerRight: () => {
            return (
              <TouchableOpacity
                style={{ paddingVertical: 10 }}
                onPress={async () => {
                  await updateUpdate(updateId, content);
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
          {update && (
            <TextInput
              value={content}
              onChangeText={(text) => setContent(text)}
              multiline
              autoFocus
            />
          )}
        </ScrollView>
      </Screen>
    </>
  );
}
