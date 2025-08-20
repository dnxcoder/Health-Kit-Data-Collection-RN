// app/steps-ios.tsx
import {
  isHealthDataAvailable,
  queryQuantitySamples
} from "@kingstinct/react-native-healthkit";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

type AuthState = "unknown" | "authorized" | "denied";
const STEP_TYPE = "HKQuantityTypeIdentifierStepCount";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function StepsIOSScreen() {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [auth, setAuth] = useState<AuthState>("unknown");
  const [hasTrackStepsPermision, setHasTrackStepsPermision] = useState(false);

  const openSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        "Abra as Configurações",
        "Ajustes → Saúde → Apps → (seu app) e permita “Passos”."
      );
    });
  };

  const readTodaySteps = useCallback(async () => {
    // v10: sem filtros nativos; filtra por data no JS
    const samples = await queryQuantitySamples(STEP_TYPE, {});
    const today = startOfToday();
    const total = (samples ?? [])
      .filter(s => new Date(s.startDate) >= today)
      .reduce((acc, s) => acc + (s.quantity ?? 0), 0);
    return Math.round(total);
  }, []);

  const fetchSteps = useCallback(async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Somente iOS", "Esta tela usa HealthKit (iPhone real).");
      return;
    }

    setLoading(true);
    try {
      const available = await isHealthDataAvailable();
      if (!available) throw new Error("HealthKit não disponível no simulador.");

      // pedimos poucas amostras; algumas versões aceitam {} como opções
      const samples = await queryQuantitySamples(STEP_TYPE, { /* limit: 1 */ });
      
    
      if (samples.length === 0) {
        setAuth("denied");
        setSteps(null);
        return; // não tenta ler se está negado
      }

      const total = await readTodaySteps();
      setSteps(total);
      setAuth("authorized");
    } catch (e: any) {
      // Qualquer erro inesperado
      setAuth("unknown");
      setSteps(null);
      Alert.alert("Erro ao obter passos", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [readTodaySteps]);

  // Busca inicial
  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  // Revalidar quando voltar do background (ex.: depois de abrir Configurações)
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") {
        fetchSteps();
      }
    });
    return () => sub.remove();
  }, [fetchSteps]);


  useEffect(()=> {
     setHasTrackStepsPermision(auth === "denied");
  },[auth])
 

  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
      >
       
        {loading ? (
          <ActivityIndicator />
        ) : hasTrackStepsPermision ? (
          <View style={{ alignItems: "center" }}>
            <Text style={{ textAlign: "center", color: "#cc0000", marginBottom: 12, fontSize:24, fontWeight:"bold" }}>
              Permissão de “Passos” negada.
            </Text>
            <Text style={{ textAlign: "center", color: "#666", marginBottom: 16 }}>
              Para continuar, ative “Passos” para este app em:
              {"\n"}Ajustes → Saúde → Apps → (seu app).
            </Text>
            <Pressable
              onPress={openSettings}
              style={{
                backgroundColor: "#1f6feb",
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Abrir Configurações</Text>
            </Pressable>
          </View>
        ) : (
          <>

 <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
          Passos de hoje (iOS / HealthKit)
        </Text>
        <Text style={{ color: "#666", marginBottom: 24 }}>
          {new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date())}
        </Text>


            <Text style={{ fontSize: 56, fontWeight: "800" }}>
              {steps ?? "--"}
            </Text>
            <Text style={{ color: "#666" }}>passos</Text>
             <Pressable
          onPress={fetchSteps}
          style={{
            marginTop: 24,
            backgroundColor: "#1f6feb",
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 12,
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {loading ? "Atualizando..." : "Atualizar"}
          </Text>
        </Pressable>
          </>
        )}

       
      </ScrollView>
    </SafeAreaView>
  );
}
