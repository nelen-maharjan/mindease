const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export type SentimentResult = {
  label: string;
  score: number;
  emotions: string[];
  signedScore: number;
};

export type ModelInfo = {
  status: string;
  loaded: boolean;
  algorithm?: string;
  trainedAt?: string;
  metrics?: Record<string, unknown>;
  error?: string;
};

export type MoodClassificationResult = {
  label: "happy" | "calm" | "sad" | "anxious" | string;
  confidence: number;
};

export type TrendAnalysisResult = {
  weekly_average: number;
  trend_direction: "improving" | "declining" | "stable";
  change_percent: number;
  anomalies: string[];
  dominant_mood: string;
};

export type MlRecommendation = {
  type: string;
  title: string;
  description: string;
  priority: number;
};

async function mlFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${ML_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`ML service ${path} failed (${res.status})`);
  }
  return res.json();
}

export async function analyzeJournalText(text: string): Promise<SentimentResult | null> {
  try {
    const data = await mlFetch("/sentiment", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    const signed =
      data.label === "positive"
        ? data.score
        : data.label === "neutral"
        ? 0
        : -Math.abs(data.score ?? 0);
    return {
      label: data.label,
      score: data.score,
      emotions: data.emotions || [],
      signedScore: signed,
    };
  } catch {
    return null;
  }
}

export async function classifyMood(text: string): Promise<MoodClassificationResult | null> {
  try {
    const data = await mlFetch("/classify-mood", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return {
      label: data.label,
      confidence: data.confidence,
    };
  } catch {
    return null;
  }
}

export async function analyzeMoodTrends(
  entries: Array<{ mood: string; intensity: number; date: string }>
): Promise<TrendAnalysisResult | null> {
  try {
    return await mlFetch("/trend", {
      method: "POST",
      body: JSON.stringify({ entries }),
    });
  } catch {
    return null;
  }
}

export async function getMlRecommendations(text: string): Promise<MlRecommendation[] | null> {
  try {
    return await mlFetch("/recommend", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  } catch {
    return null;
  }
}

export async function getMlModelInfo(): Promise<ModelInfo> {
  try {
    return await mlFetch("/model/info");
  } catch (error) {
    return {
      status: "offline",
      loaded: false,
      error: error instanceof Error ? error.message : "Unreachable",
    };
  }
}

export async function retrainMlModel() {
  return mlFetch("/model/train", { method: "POST" });
}
