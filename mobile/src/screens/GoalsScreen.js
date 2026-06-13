import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";
import { Button, Card, EmptyState, Field, ProgressBar } from "../components/ui";
import { colors, spacing } from "../theme";

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [goalType, setGoalType] = useState("weight_loss");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    const response = await api.get("/goals");
    setGoals(response.data);
  }

  useFocusEffect(
    useCallback(() => {
      loadGoals().catch(() => {});
    }, [])
  );

  async function addGoal() {
    if (!goalType || !targetValue || !unit) {
      Alert.alert("Goal details", "Goal type, target value, and unit are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/goals", {
        goal_type: goalType,
        target_value: Number(targetValue),
        unit,
        target_date: targetDate,
        status: "active",
      });
      setTargetValue("");
      await loadGoals();
    } catch (err) {
      Alert.alert("Could not add goal", err.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Goals</Text>
      {goals.length ? (
        goals.map((goal) => {
          const latest = goal.progress_entries?.[goal.progress_entries.length - 1];
          const current = Number(latest?.current_value || 0);
          const target = Number(goal.target_value || 1);
          return (
            <Card key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalType}>{goal.goal_type.replaceAll("_", " ")}</Text>
                <Text style={styles.status}>{goal.status}</Text>
              </View>
              <ProgressBar value={current / target} tint={goal.status === "completed" ? colors.primary : colors.warning} />
              <Text style={styles.goalMeta}>
                {current.toFixed(1)} / {target.toFixed(1)} {goal.unit}
              </Text>
            </Card>
          );
        })
      ) : (
        <EmptyState text="No goals yet." />
      )}

      <Text style={styles.sectionTitle}>Add goal</Text>
      <Card style={styles.form}>
        <Field label="Goal type" value={goalType} onChangeText={setGoalType} />
        <Field label="Target value" value={targetValue} onChangeText={setTargetValue} keyboardType="numeric" />
        <Field label="Unit" value={unit} onChangeText={setUnit} />
        <Field label="Target date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} />
        <Button title={saving ? "Adding..." : "Add goal"} onPress={addGoal} disabled={saving} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  goalCard: {
    gap: spacing.md,
  },
  goalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalMeta: {
    color: colors.muted,
  },
  goalType: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  status: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
