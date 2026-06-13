import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { api } from "../api/client";
import { Button, Card, EmptyState, Field, ProgressBar } from "../components/ui";
import { colors, spacing } from "../theme";

const MACRO_GOALS = { protein: 160, carbs: 260, fat: 75 };
const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionScreen() {
  const [foods, setFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState("100");
  const [mealType, setMealType] = useState("breakfast");
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);

  async function loadNutrition() {
    const [foodsRes, logsRes] = await Promise.all([api.get("/nutrition/foods"), api.get("/nutrition/logs")]);
    setFoods(foodsRes.data);
    setLogs(logsRes.data);
    if (!selectedFood && foodsRes.data.length) {
      setSelectedFood(foodsRes.data[0]);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadNutrition().catch(() => {});
    }, [])
  );

  const todayMacros = useMemo(() => {
    const today = todayIso();
    const todayLogs = logs.filter((log) => log.log_date === today);
    const calories = todayLogs.reduce((sum, log) => sum + Number(log.total_calories || 0), 0);
    const foodById = new Map(foods.map((food) => [food.id, food]));
    const macros = todayLogs.reduce(
      (total, log) => {
        for (const item of log.meal_items || []) {
          const food = foodById.get(item.food_item_id);
          const multiplier = Number(item.quantity_g || 0) / 100;
          if (food) {
            total.protein += Number(food.protein_g || 0) * multiplier;
            total.carbs += Number(food.carbs_g || 0) * multiplier;
            total.fat += Number(food.fat_g || 0) * multiplier;
          }
        }
        return total;
      },
      { protein: 0, carbs: 0, fat: 0 }
    );
    return { calories, ...macros };
  }, [foods, logs]);

  const selectedMacros = useMemo(() => {
    if (!selectedFood) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const multiplier = Number(quantity || 0) / 100;
    return {
      calories: Number(selectedFood.calories_per_100g || 0) * multiplier,
      protein: Number(selectedFood.protein_g || 0) * multiplier,
      carbs: Number(selectedFood.carbs_g || 0) * multiplier,
      fat: Number(selectedFood.fat_g || 0) * multiplier,
    };
  }, [quantity, selectedFood]);

  async function saveMeal() {
    if (!selectedFood) {
      Alert.alert("Pick a food", "Select a food item first.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/nutrition/logs", {
        log_date: todayIso(),
        meal_type: mealType,
        total_calories: selectedMacros.calories,
        meal_items: [
          {
            food_item_id: selectedFood.id,
            quantity_g: Number(quantity || 0),
            calories: selectedMacros.calories,
          },
        ],
      });
      await loadNutrition();
      Alert.alert("Meal logged", `${selectedFood.name} added to ${mealType}.`);
    } catch (err) {
      Alert.alert("Could not log meal", err.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.summary}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.calories}>{Math.round(todayMacros.calories)} kcal</Text>
        <Macro label="Protein" current={todayMacros.protein} goal={MACRO_GOALS.protein} />
        <Macro label="Carbs" current={todayMacros.carbs} goal={MACRO_GOALS.carbs} />
        <Macro label="Fat" current={todayMacros.fat} goal={MACRO_GOALS.fat} />
      </Card>

      <Text style={styles.sectionTitle}>Meal type</Text>
      <View style={styles.segment}>
        {mealTypes.map((type) => (
          <Pressable
            key={type}
            onPress={() => setMealType(type)}
            style={[styles.segmentItem, mealType === type && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, mealType === type && styles.segmentTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Quantity (g)" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />

      <Text style={styles.sectionTitle}>Food items</Text>
      {foods.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foodList}>
          {foods.map((food) => {
            const active = selectedFood?.id === food.id;
            return (
              <Pressable
                key={food.id}
                onPress={() => setSelectedFood(food)}
                style={[styles.foodCard, active && styles.foodCardActive]}
              >
                <Text style={[styles.foodName, active && styles.foodTextActive]}>{food.name}</Text>
                <Text style={[styles.foodMeta, active && styles.foodTextActive]}>
                  {Math.round(food.calories_per_100g)} kcal / 100g
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <EmptyState text="No food items found." />
      )}

      <Button title={saving ? "Saving..." : "Log meal"} onPress={saveMeal} disabled={saving} />
    </ScrollView>
  );
}

function Macro({ label, current, goal }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {current.toFixed(1)}g / {goal}g
        </Text>
      </View>
      <ProgressBar value={current / goal} />
    </View>
  );
}

const styles = StyleSheet.create({
  calories: {
    color: colors.primaryDark,
    fontSize: 30,
    fontWeight: "800",
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  foodCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    minWidth: 150,
    padding: spacing.md,
  },
  foodCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  foodList: {
    gap: spacing.md,
  },
  foodMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  foodName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  foodTextActive: {
    color: colors.surface,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroLabel: {
    color: colors.text,
    fontWeight: "800",
  },
  macroRow: {
    gap: spacing.sm,
  },
  macroValue: {
    color: colors.muted,
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
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: spacing.md,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  segmentTextActive: {
    color: colors.surface,
  },
  summary: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
});
