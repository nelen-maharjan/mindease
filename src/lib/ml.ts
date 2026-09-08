const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

type SentimentResult = {
  label: string;
  score: number;
  emotions: string[];
  signedScore: number;
};

type ModelInfo = {
  status: string;
  loaded: boolean;
  algorithm?: string;
  trainedAt?: string;
  metrics?: Record<string, unknown>;
  error?: string;
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
      data.label === "positive" ? data.score :
      data.label === "neutral" ? 0 :
      -Math.abs(data.score ?? 0);
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
