import { useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { authClient, captureToken } from "@/lib/auth";
import { GradientButton, T, inputStyle } from "@/components/ui";

const hero = require("@/assets/hero.jpg");

export default function SignInScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google">(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    void qc.invalidateQueries();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const submit = async () => {
    setError(null);
    setBusy("email");
    const opts = { onSuccess: captureToken };
    const res =
      mode === "in"
        ? await authClient.signIn.email({ email: email.trim(), password }, opts)
        : await authClient.signUp.email({ email: email.trim(), password, name: name.trim() || email.split("@")[0] }, opts);
    setBusy(null);
    if (res.error) return setError(res.error.message ?? "Something went wrong");
    await authClient.getSession();
    done();
  };

  const google = async () => {
    setError(null);
    setBusy("google");
    const res = await authClient.managedAuth.signIn({ provider: "google" });
    setBusy(null);
    if (res.error) {
      if (res.error.code !== "AUTH_SESSION_DISMISSED") setError(res.error.message ?? "Google sign-in failed");
      return;
    }
    done();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ImageBackground source={hero} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340 }} resizeMode="cover">
        <LinearGradient colors={["rgba(255,61,165,0.35)", "rgba(11,10,15,0.7)", c.background]} style={{ flex: 1 }} />
      </ImageBackground>
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "flex-end", gap: 14 }} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityLabel="Close" style={{ position: "absolute", top: 8, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
            <View style={{ marginTop: 120 }}>
              <T variant="display" style={{ fontSize: 34 }}>
                Earbass<T variant="display" style={{ fontSize: 34, color: c.primary }}>.</T>
              </T>
              <T style={{ color: c.mutedForeground, marginTop: 4 }}>{mode === "in" ? "Welcome back. Plug in and play." : "Join the home of AI & indie electronic music."}</T>
            </View>

            <Pressable onPress={() => void google()} disabled={!!busy} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#fff", borderRadius: 999, paddingVertical: 13, opacity: pressed || busy ? 0.8 : 1 })}>
              <Ionicons name="logo-google" size={18} color="#0B0A0F" />
              <Text style={{ color: "#0B0A0F", fontFamily: Fonts.semibold, fontSize: 15 }}>{busy === "google" ? "Opening Google…" : "Continue with Google"}</Text>
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
              <T variant="small">or with email</T>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            </View>

            {mode === "up" ? <TextInput value={name} onChangeText={setName} placeholder="Artist name" placeholderTextColor={c.dim} style={inputStyle(c)} /> : null}
            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={c.dim} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={inputStyle(c)} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" placeholderTextColor={c.dim} secureTextEntry style={inputStyle(c)} onSubmitEditing={() => void submit()} />
            {error ? <T variant="small" style={{ color: c.destructive }}>{error}</T> : null}
            <GradientButton label={mode === "in" ? "Sign in" : "Create account"} loading={busy === "email"} disabled={!email || password.length < 8 || !!busy} onPress={() => void submit()} />
            <Pressable onPress={() => setMode(mode === "in" ? "up" : "in")} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ color: c.mutedForeground, fontFamily: Fonts.body }}>
                {mode === "in" ? "New here? " : "Have an account? "}
                <Text style={{ color: c.primary, fontFamily: Fonts.semibold }}>{mode === "in" ? "Create an account" : "Sign in"}</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
