import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { Button, Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("user001@fitlogpro.dev");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.panel}>
        <Text style={styles.brand}>FitLog Pro</Text>
        <Text style={styles.subtitle}>Workout and nutrition tracking</Text>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={submitting ? "Signing in..." : "Sign in"} onPress={handleLogin} disabled={submitting} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  panel: {
    gap: spacing.lg,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    marginBottom: spacing.md,
  },
});
