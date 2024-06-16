import { Text, SafeAreaView, ScrollView, View } from "react-native";

import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";

import { downloadDatabase } from "../lib/databaseSetup";
import Markdown from "react-native-markdown-display";
import { getProjects } from "../lib/database";

import { styles } from "../components/styles";
import { Screen } from "../components/Screen";

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDatabase = async () => {
    setLoading(true);
    await downloadDatabase();
    setLoading(false);
    const projects = await getProjects();
    setRows(projects);
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "cosmith.fr",
        }}
      />
      <Screen>
        <ScrollView>
          {rows.map((project) => (
            <View key={project.id}>
              <Link
                push
                href={`/projects/${project.id}`}
                style={styles.projectLink}
              >
                {project.title}
              </Link>
              <Text>
                {project.id} - {project.slug}
              </Text>
              {project.description && (
                <View style={styles.projectPreview}>
                  <Markdown
                    style={{
                      body: { fontSize: 11, margin: 0, padding: 0 },
                      heading1: { fontSize: 14 },
                      heading2: { fontSize: 13 },
                      heading3: { fontSize: 12 },
                    }}
                  >
                    {project.description.slice(0, 100) + "..."}
                  </Markdown>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </Screen>
    </>
  );
}
