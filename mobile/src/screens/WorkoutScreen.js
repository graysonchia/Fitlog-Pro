import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";
import { Button, Card, EmptyState, Field } from "../components/ui";
import { colors, spacing } from "../theme";

export default function WorkoutScreen() {
  const [exercises, setExercises] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sessionName, setSessionName] = useState("Today's Workout");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.get("/exercises").then((res) => setExercises(res.data)).catch(() => setExercises([]));
    }, [])
  );

  function toggleExercise(exercise) {
    const exists = selected.some((item) => item.exercise_id === exercise.id);
    if (exists) {
      setSelected(selected.filter((item) => item.exercise_id !== exercise.id));
    } else {
      setSelected([
        ...selected,
        {
          exercise_id: exercise.id,
          name: exercise.name,
          sets: [{ set_number: 1, weight_kg: "", reps: "" }],
        },
      ]);
    }
  }

  function updateSet(exerciseId, index, key, value) {
    setSelected((items) =>
      items.map((item) =>
        item.exercise_id === exerciseId
          ? {
              ...item,
              sets: item.sets.map((set, setIndex) =>
                setIndex === index ? { ...set, [key]: value } : set
              ),
            }
          : item
      )
    );
  }

  function addSet(exerciseId) {
    setSelected((items) =>
      items.map((item) =>
        item.exercise_id === exerciseId
          ? {
              ...item,
              sets: [
                ...item.sets,
                { set_number: item.sets.length + 1, weight_kg: "", reps: "" },
              ],
            }
          : item
      )
    );
  }

  async function saveWorkout() {
    if (!selected.length) {
      Alert.alert("Pick exercises", "Add at least one exercise before saving.");
      return;
    }
    const startedAt = new Date();
    const payload = {
      name: sessionName || "Workout",
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + 45 * 60 * 1000).toISOString(),
      total_volume_kg: selected.reduce(
        (sum, item) =>
          sum +
          item.sets.reduce(
            (setSum, set) => setSum + Number(set.weight_kg || 0) * Number(set.reps || 0),
            0
          ),
        0
      ),
      exercises: selected.map((item, index) => ({
        exercise_id: item.exercise_id,
        order_index: index + 1,
        sets: item.sets.map((set, setIndex) => ({
          set_number: setIndex + 1,
          weight_kg: Number(set.weight_kg || 0),
          reps: Number(set.reps || 0),
          rest_seconds: 90,
          rpe: null,
        })),
      })),
    };
    setSaving(true);
    try {
      await api.post("/workouts", payload);
      setSelected([]);
      Alert.alert("Workout saved", "Session logged successfully.");
    } catch (err) {
      Alert.alert("Could not save workout", err.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label="Session name" value={sessionName} onChangeText={setSessionName} />

      <Text style={styles.sectionTitle}>Pick exercises</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseList}>
        {exercises.map((exercise) => {
          const active = selected.some((item) => item.exercise_id === exercise.id);
          return (
            <Pressable
              key={exercise.id}
              onPress={() => toggleExercise(exercise)}
              style={[styles.exerciseChip, active && styles.exerciseChipActive]}
            >
              <Text style={[styles.exerciseText, active && styles.exerciseTextActive]}>{exercise.name}</Text>
              <Text style={[styles.muscleText, active && styles.exerciseTextActive]}>{exercise.muscle_group}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Sets</Text>
      {selected.length ? (
        selected.map((item) => (
          <Card key={item.exercise_id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            {item.sets.map((set, index) => (
              <View key={`${item.exercise_id}-${index}`} style={styles.setRow}>
                <Text style={styles.setNumber}>Set {index + 1}</Text>
                <View style={styles.setField}>
                  <Field
                    label="Kg"
                    value={String(set.weight_kg)}
                    onChangeText={(value) => updateSet(item.exercise_id, index, "weight_kg", value)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.setField}>
                  <Field
                    label="Reps"
                    value={String(set.reps)}
                    onChangeText={(value) => updateSet(item.exercise_id, index, "reps", value)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ))}
            <Button title="Add set" variant="secondary" onPress={() => addSet(item.exercise_id)} />
          </Card>
        ))
      ) : (
        <EmptyState text="Select exercises to start logging sets." />
      )}

      <Button title={saving ? "Saving..." : "Save workout"} onPress={saveWorkout} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  exerciseCard: {
    gap: spacing.md,
  },
  exerciseChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 148,
    padding: spacing.md,
  },
  exerciseChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  exerciseList: {
    gap: spacing.md,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  exerciseText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  exerciseTextActive: {
    color: colors.surface,
  },
  muscleText: {
    color: colors.muted,
    fontSize: 12,
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
  setField: {
    flex: 1,
  },
  setNumber: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    width: 52,
  },
  setRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
