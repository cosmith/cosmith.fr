import { SafeAreaView } from "react-native";
import { styles } from "./styles";

export function Screen({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
}
