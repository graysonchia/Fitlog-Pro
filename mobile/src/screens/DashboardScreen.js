import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";
import { Button, Card, EmptyState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function computeStreak(workouts) {
  const days = new Set(workouts.map((item) => item.started_at?.slice(0, 10)).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function DashboardScreen() {
  const { logout, user } = useAuth();
  const [metrics, setMetrics] = useState({
    calories: 0,
    streak: 0,
    latestWeight: "--",
    activeGoals: 0,
  });
  const [goals, setGoals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    setRefreshing(true);
    try {
      const [logsRes, workoutsRes, bodyRes, goalsRes] = await Promise.all([
        api.get("/nutrition/logs"),
        api.get("/workouts"),
        api.get("/body-metrics"),
        api.get("/goals"),
      ]);
      const today = todayIso();
      const calories = logsRes.data
        .filter((log) => log.log_date === today)
        .reduce((sum, log) => sum + Number(log.total_calories || 0), 0);
      const latestBody = bodyRes.data[0];
      const activeGoals = goalsRes.data.filter((goal) => goal.status === "active");
      setMetrics({
        calories: Math.round(calories),
        streak: computeStreak(workoutsRes.data),
        latestWeight: latestBody ? `${Number(latestBody.weight_kg).toFixed(1)} kg` : "--",
        activeGoals: activeGoals.length,
      });
      setGoals(activeGoals.slice(0, 3));
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.title}>{user?.name || "Athlete"}</Text>
        </View>
        <Button title="Log out" variant="secondary" onPress={logout} />
      </View>

      <View style={styles.grid}>
        <Kpi label="Today's calories" value={metrics.calories} />
        <Kpi label="Workout streak" value={`${metrics.streak} days`} />
        <Kpi label="Latest weight" value={metrics.latestWeight} />
        <Kpi label="Active goals" value={metrics.activeGoals} />
      </View>

      <Text style={styles.sectionTitle}>Active goals</Text>
      {goals.length ? (
        goals.map((goal) => (
          <Card key={goal.id} style={styles.goalCard}>
            <Text style={styles.goalType}>{goal.goal_type.replaceAll("_", " ")}</Text>
            <Text style={styles.goalMeta}>
              Target {goal.target_value} {goal.unit}
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState text="No active goals yet." />
      )}
    </ScrollView>
  );
}

function Kpi({ label, value }) {
  return (
    <Card style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  goalCard: {
    gap: spacing.xs,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kpi: {
    flexBasis: "47%",
    gap: spacing.sm,
    minHeight: 104,
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  kpiValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
});
