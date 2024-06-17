import { Link, Stack, useLocalSearchParams } from "expo-router";

import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { getProject, getUpdates } from "../../../lib/database";
import { useEffect, useState } from "react";
import Markdown from "react-native-markdown-display";
import { Screen } from "../../../components/Screen";
import { styles } from "../../../components/styles";
import { router } from "expo-router";

export default function Project() {
  const { projectId } = useLocalSearchParams();
  const [project, setProject] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const project = await getProject(projectId);
      const updates = await getUpdates(projectId);
      setProject(project);
      setUpdates(updates);
    };

    fetchData();
  }, [projectId, refreshKey]);

  return (
    <>
      <Stack.Screen
        options={{
          title: project?.title ?? "Loading...",
          headerRight: () => {
            return (
              <Link push href={`/projects/${projectId}/updates/new`}>
                <Text>Add</Text>
              </Link>
            );
          },
        }}
      />
      <Screen>
        <Text style={styles.title}>{project?.title}</Text>
        <ScrollView>
          <RefreshControl
            refreshing={false}
            onRefresh={() => setRefreshKey(refreshKey + 1)}
          />
          {updates.map((update) => (
            <Pressable
              key={update.id}
              onPress={() => {
                router.push(`/projects/${projectId}/updates/${update.id}`);
              }}
            >
              <Text style={styles.subtitle}>{update.created_at}</Text>
              <Markdown>{update.content}</Markdown>
            </Pressable>
          ))}
        </ScrollView>
      </Screen>
    </>
  );
}
