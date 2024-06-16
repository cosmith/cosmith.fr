import { Stack, useLocalSearchParams } from "expo-router";

import { ScrollView, Text, View } from "react-native";
import { getProject, getUpdates } from "../../lib/database";
import { useEffect, useState } from "react";
import Markdown from "react-native-markdown-display";
import { Screen } from "../../components/Screen";
import { styles } from "../../components/styles";

export default function Project() {
  const { id } = useLocalSearchParams();
  const [project, setProject] = useState(null);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const project = await getProject(id);
      const updates = await getUpdates(id);
      console.warn(project, id);
      setProject(project);
      setUpdates(updates);
    };

    fetchData();
  }, [id]);

  return (
    <>
      <Stack.Screen
        options={{
          title: project?.title ?? "Loading...",
        }}
      />
      <Screen>
        <Text style={styles.title}>{project?.title}</Text>
        <ScrollView>
          {updates.map((update) => (
            <View key={update.id}>
              <Text style={styles.subtitle}>{update.created_at}</Text>
              <Markdown>{update.content}</Markdown>
            </View>
          ))}
        </ScrollView>
      </Screen>
    </>
  );
}
