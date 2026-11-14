import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts, GRADIENT } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { useMe } from "@/queries/me";
import { PLATFORM_ID, useDonate, useDonationSummary, useDonationsReceived, useSetDonationGoal } from "@/queries/donations";
import { Card, GhostButton, GradientButton, T, inputStyle } from "@/components/ui";

const PRESETS = [3, 5, 10, 25, 50];
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function Meter({ raised, goal, height = 8 }: { raised: number; goal: number | null; height?: number }) {
  const c = useColors();
  const pct = goal ? Math.min(1, raised / goal) : 1;
  const w = Math.max(pct, raised > 0 ? 0.03 : 0) * 100;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.surface2, overflow: "hidden" }}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${w}%`, height: "100%", borderRadius: height / 2, opacity: goal ? 1 : 0.4 }} />
    </View>
  );
}

/** "Support this artist" card with goal meter. recipientId = artist userId or "earbass". */
export function DonationBar({ recipientId, trackId }: { recipientId: string; trackId?: number }) {
  const c = useColors();
  const q = useDonationSummary(recipientId);
  const { session } = useMe();
  const [open, setOpen] = useState(false);
  const d = q.data;
  if (!d) return <View style={{ height: 130, borderRadius: 20, backgroundColor: c.card }} />;
  const own = session.data?.user.id === recipientId;
  const pct = d.goal ? Math.round((d.raised / d.goal) * 100) : null;
  return (
    <Card style={{ gap: 10, borderColor: "rgba(255,61,165,0.25)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="heart-circle" size={18} color={c.primary} />
        <T variant="label" style={{ color: c.primary, flex: 1 }} numberOfLines={1}>
          {recipientId === PLATFORM_ID ? "Support Earbass" : `Support ${d.name}`}
        </T>
      </View>
      {d.pitch ? <T variant="small">{d.pitch}</T> : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <T>
          <T variant="display" style={{ fontSize: 26 }}>{money(d.raised)}</T>
          <T variant="small">{d.goal ? `  of ${money(d.goal)}` : "  raised"}</T>
        </T>
        <View style={{ alignItems: "flex-end" }}>
          {pct !== null ? <T style={{ fontFamily: Fonts.display }}>{pct}%</T> : null}
          <T variant="small">{d.supporters} supporters</T>
        </View>
      </View>
      <Meter raised={d.raised} goal={d.goal} />
      {d.recent.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {d.recent.slice(0, 3).map((r) => (
            <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: "100%" }}>
              <Ionicons name={r.source === "app" ? "phone-portrait-outline" : "globe-outline"} size={11} color={c.dim} />
              <T variant="small" style={{ color: c.foreground, fontFamily: Fonts.semibold }}>{r.donorName}</T>
              <T variant="small" style={{ color: c.lime }}>{money(r.amount)}</T>
            </View>
          ))}
        </View>
      ) : null}
      {own ? (
        <GhostButton label="Edit goal in Library" icon="create-outline" onPress={() => router.push("/library")} />
      ) : (
        <GradientButton label="Donate" icon="heart" onPress={() => (session.data?.user ? setOpen(true) : router.push("/sign-in"))} />
      )}
      <DonateSheet visible={open} recipientId={recipientId} recipientName={d.name} trackId={trackId} onClose={() => setOpen(false)} />
    </Card>
  );
}

/** Slim platform-fund banner for the home feed. */
export function PlatformDonationBanner() {
  const c = useColors();
  const q = useDonationSummary(PLATFORM_ID);
  const { signedIn } = useMe();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const d = q.data;
  if (!d || hidden) return null;
  return (
    <View style={{ marginHorizontal: 20, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Ionicons name="heart-circle" size={22} color={c.primary} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T variant="small" style={{ color: c.foreground }} numberOfLines={1}>
            Keep Earbass free · <T variant="small" style={{ color: c.foreground, fontFamily: Fonts.display }}>{money(d.raised)}</T> / {money(d.goal ?? 0)}
          </T>
        </View>
        <Meter raised={d.raised} goal={d.goal} height={5} />
      </View>
      <GradientButton small label="Donate" onPress={() => (signedIn ? setOpen(true) : router.push("/sign-in"))} />
      <Pressable onPress={() => setHidden(true)} hitSlop={8} accessibilityLabel="Hide donation banner">
        <Ionicons name="close" size={16} color={c.mutedForeground} />
      </Pressable>
      <DonateSheet visible={open} recipientId={PLATFORM_ID} recipientName="Earbass" onClose={() => setOpen(false)} />
    </View>
  );
}

export function DonateSheet({ visible, recipientId, recipientName, trackId, onClose }: { visible: boolean; recipientId: string; recipientName: string; trackId?: number; onClose: () => void }) {
  const c = useColors();
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const donate = useDonate();
  const value = custom ? Math.floor(Number(custom)) : amount;
  const valid = Number.isFinite(value) && value >= 1 && value <= 1000;
  const close = () => {
    donate.reset();
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={close} />
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: c.border }}>
          <View style={{ padding: 20, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T variant="h1">Donate to {recipientName}</T>
                <T variant="small">One-time donation, paid securely with Stripe.</T>
              </View>
              <Pressable onPress={close} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={18} color={c.foreground} />
              </Pressable>
            </View>
            {donate.data ? (
              <View style={{ backgroundColor: "rgba(198,255,61,0.1)", borderRadius: 18, padding: 16, gap: 8 }}>
                <T style={{ color: c.lime, fontFamily: Fonts.semibold }}>
                  {donate.data.status === "paid" ? `Thank you! Your ${money(donate.data.amount)} donation is in.` : "Payment not confirmed yet. If you completed checkout it will appear on the bar shortly."}
                </T>
                <GhostButton label="Done" onPress={close} />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {PRESETS.map((p) => {
                    const on = !custom && amount === p;
                    return (
                      <Pressable key={p} onPress={() => { setAmount(p); setCustom(""); }} style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: on ? undefined : c.surface2 }}>
                        {on ? (
                          <LinearGradient colors={GRADIENT} style={{ paddingVertical: 13, alignItems: "center" }}>
                            <T style={{ fontFamily: Fonts.display, color: "#fff" }}>${p}</T>
                          </LinearGradient>
                        ) : (
                          <View style={{ paddingVertical: 13, alignItems: "center" }}>
                            <T style={{ fontFamily: Fonts.display }}>${p}</T>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={custom}
                  onChangeText={(t) => setCustom(t.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  placeholder="Custom amount ($)"
                  placeholderTextColor={c.dim}
                  style={inputStyle(c)}
                />
                <TextInput value={message} onChangeText={setMessage} maxLength={140} placeholder="Say something nice (optional)" placeholderTextColor={c.dim} style={inputStyle(c)} />
                {donate.error ? <T variant="small" style={{ color: c.destructive }}>{donate.error.message}</T> : null}
                <GradientButton
                  label={valid ? `Donate ${money(value)}` : "Enter $1 – $1,000"}
                  icon="lock-closed"
                  loading={donate.isPending}
                  disabled={!valid}
                  onPress={() => donate.mutate({ recipientId, trackId, amount: value, message })}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Library card where an artist sets their own goal. */
export function DonationGoalCard({ goal, pitch }: { goal: number | null; pitch: string }) {
  const c = useColors();
  const [g, setG] = useState(goal ? String(goal) : "");
  const [p, setP] = useState(pitch);
  const received = useDonationsReceived(true);
  const save = useSetDonationGoal();
  const n = g ? Math.floor(Number(g)) : null;
  const raised = received.data?.raised ?? 0;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="heart-circle" size={18} color={c.primary} />
        <T variant="label" style={{ color: c.primary }}>Donation goal</T>
      </View>
      <T>
        <T variant="display" style={{ fontSize: 24 }}>{money(raised)}</T>
        <T variant="small">{n ? `  of ${money(n)}` : "  raised"} · {received.data?.supporters ?? 0} supporters</T>
      </T>
      <Meter raised={raised} goal={n} />
      <TextInput value={g} onChangeText={(t) => setG(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="Goal in $ (blank = no goal)" placeholderTextColor={c.dim} style={inputStyle(c)} />
      <TextInput value={p} onChangeText={setP} maxLength={200} placeholder="What's it for? e.g. New monitors" placeholderTextColor={c.dim} style={inputStyle(c)} />
      {n !== null && n < 10 ? <T variant="small" style={{ color: c.destructive }}>Minimum goal is $10</T> : null}
      {save.error ? <T variant="small" style={{ color: c.destructive }}>{save.error.message}</T> : null}
      <GradientButton label={save.isSuccess ? "Saved" : "Save goal"} icon={save.isSuccess ? "checkmark" : "save-outline"} loading={save.isPending} disabled={n !== null && n < 10} onPress={() => save.mutate({ goal: n, pitch: p })} />
    </Card>
  );
}

/** Compact heart + share used on tiles and rows. */

export { LikeShare } from "@/components/like-share";
