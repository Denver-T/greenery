import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import MobileScaffold from "../components/MobileScaffold";
import { COLORS, RADII, SPACING } from "../theme";

const TASK_SETS = [
  {
    id: 1,
    title: "Lobby maintenance set",
    forms: ["REQ-1738", "REQ-1328", "REQ-7543"],
    summary: "Recurring placements and cleanup work grouped for repeat service visits.",
  },
  {
    id: 2,
    title: "Replacement install set",
    forms: ["REQ-3333", "REQ-4444", "REQ-5555"],
    summary: "Tasks grouped around plant swap-outs and staging prep.",
  },
  {
    id: 3,
    title: "Atrium service set",
    forms: ["REQ-6666", "REQ-7777", "REQ-8888"],
    summary: "A larger grouped job set for shared field execution.",
  },
];

export default function TaskSetList() {
  return (
    <MobileScaffold
      eyebrow="Task sets"
      title="Grouped field work"
      subtitle="Reusable bundles for repeat field work."
    >
      <View style={styles.stack}>
        {TASK_SETS.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={COLORS.forestDeep} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSummary}>{item.summary}</Text>
              </View>
            </View>

            <View style={styles.formList}>
              {item.forms.map((form) => (
                <View key={form} style={styles.formPill}>
                  <Text style={styles.formText}>{form}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>View task set</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </MobileScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.sm,
  },
  card: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardHeader: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parchment,
  },
  headerCopy: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  cardSummary: {
    marginTop: 6,
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  formList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: SPACING.md,
  },
  formPill: {
    borderRadius: RADII.pill,
    backgroundColor: COLORS.parchment,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  formText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    marginTop: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.forestDeep,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: COLORS.textOnBrand,
    fontSize: 14,
    fontWeight: "700",
  },
});
