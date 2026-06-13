import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";
import { Button, Card, EmptyState, Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [saving, setSaving] = useState(false);

  async function loadMetrics() {
    const response = await api.get("/body-metrics");
    setMetrics(response.data);
  }

  useFocusEffect(
    useCallback(() => {
      loadMetrics().catch(() => {});
    }, [])
  );

  async function saveMetric() {
    if (!weight) {
      Alert.alert("Weight required", "Enter a weight before saving.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/body-metrics", {
        weight_kg: Number(weight),
        body_fat_pct: bodyFat ? Number(bodyFat) : null,
        muscle_mass_kg: muscleMass ? Number(muscleMass) : null,
        logged_date: todayIso(),
      });
      setWeight("");
      setBodyFat("");
      setMuscleMass("");
      await loadMetrics();
    } catch (err) {
      Alert.alert("Could not save metrics", err.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <Text style={styles.name}>{user?.name || "Profile"}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>
          {user?.fitness_level || "Fitness level not set"} · {user?.height_cm ? `${user.height_cm} cm` : "Height not set"}
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Weight entry</Text>
      <Card style={styles.form}>
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
        <Field label="Body fat %" value={bodyFat} onChangeText={setBodyFat} keyboardType="numeric" />
        <Field label="Muscle mass (kg)" value={muscleMass} onChangeText={setMuscleMass} keyboardType="numeric" />
        <Button title={saving ? "Saving..." : "Save metrics"} onPress={saveMetric} disabled={saving} />
      </Card>

      <Text style={styles.sectionTitle}>Body metrics log</Text>
      {metrics.length ? (
        metrics.slice(0, 10).map((metric) => (
          <Card key={metric.id} style={styles.metricCard}>
            <Text style={styles.metricDate}>{metric.logged_date}</Text>
            <Text style={styles.metricValue}>{Number(metric.weight_kg).toFixed(1)} kg</Text>
            <Text style={styles.meta}>
              Body fat {metric.body_fat_pct ?? "--"}% · Muscle {metric.muscle_mass_kg ?? "--"} kg
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState text="No body metrics logged yet." />
      )}
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
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  metricCard: {
    gap: spacing.xs,
  },
  metricDate: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  profileCard: {
    gap: spacing.xs,
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
});
