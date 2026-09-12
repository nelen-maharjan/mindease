import json
from pathlib import Path

corpus_path = Path("python-ml-service/data/mood_corpus.json")
data = json.loads(corpus_path.read_text(encoding="utf-8"))

# Additional realistic phrases targeting real-world user expressions
ANXIOUS_ADDITIONS = [
  "I am feeling very stressed due to just sleeping 3hours today and i feel tired and don't feel like doing anything.",
  "I'm feeling very stressed and overwhelmed with work and lack of sleep.",
  "Only got 3 hours of sleep last night and I feel so stressed, anxious, and exhausted.",
  "I am feeling extremely stressed out, tired, and under immense pressure today.",
  "I barely slept 3 hours and now I'm feeling very stressed and unable to focus.",
  "Feeling so stressed today because I didn't sleep well and everything is piling up.",
  "I feel stressed, anxious, and restless after sleeping only a few hours.",
  "My stress levels are through the roof, I'm exhausted and can't relax.",
  "Feeling very stressed, tired, and anxious about everything on my plate.",
  "I'm so stressed out today, my head hurts and I feel completely drained.",
  "I am feeling stressed and panicked about my upcoming deadlines.",
  "Too much stress, not enough sleep, feeling anxious and jittery all day.",
  "I'm feeling very stressed and tense, I can't calm down or sleep.",
  "Everything is making me feel stressed and anxious today.",
  "Slept badly for 3 hours, feeling stressed, tired, and on edge.",
  "I feel very stressed and worried about my exams and future.",
  "I'm feeling so stressed, my mind is racing and I feel physically sick.",
  "Feeling stressed, tired, and overwhelmed by all these responsibilities.",
  "I am feeling very stressed and anxious about my health and work.",
  "Slept 3 hours, feeling stressed out, irritable, and anxious.",
  "I'm feeling very stressed because nothing is going according to plan.",
  "I am feeling stressed, pressured, and unable to take a deep breath.",
  "Feeling very stressed and drained from constant worrying and lack of rest.",
  "I'm so stressed and anxious, I feel like breaking down.",
  "Feeling very stressed today, my heart is pounding and I'm exhausted.",
  "I slept only 3 hours and I'm feeling very stressed, tired, and burnt out.",
  "I am feeling stressed out and anxious, everything feels too chaotic.",
  "Feeling very stressed and uneasy, I can't stop thinking about what could go wrong.",
  "I am feeling very stressed and tense after a sleepless night.",
  "Feeling very stressed, overwhelmed, and completely exhausted today."
]

SAD_ADDITIONS = [
  "I feel tired and don't feel like doing anything today.",
  "Feeling so tired, drained, and sad, I just want to stay in bed.",
  "I feel exhausted, unhappy, and lack motivation for anything.",
  "Feeling very sad and empty today, nothing brings me joy.",
  "I am feeling tired, useless, and down about everything.",
  "Feeling so tired and miserable, I don't feel like talking to anyone.",
  "I'm feeling tired, hopeless, and emotionally exhausted.",
  "Feeling sad, tired, and overwhelmed by a sense of loneliness.",
  "I feel tired and heavy inside, like everything takes immense effort.",
  "Feeling so tired, sad, and disappointed in myself today.",
  "I'm feeling tired and unmotivated, nothing feels rewarding.",
  "Feeling sad, tired, and crying for no apparent reason.",
  "I feel tired, burnt out, and completely lacking energy.",
  "Feeling so tired, lonely, and isolated from everyone.",
  "I'm feeling tired, helpless, and filled with deep sadness.",
  "Feeling tired and numb, I don't feel like doing anything at all.",
  "I am feeling tired, broken, and struggling to keep going.",
  "Feeling sad, exhausted, and burdened by negative thoughts.",
  "I feel tired, sluggish, and deeply unhappy with where I am.",
  "Feeling so tired and defeated after trying so hard."
]

CALM_ADDITIONS = [
  "I am feeling calm, relaxed, and at peace with everything right now.",
  "Feeling very calm, centered, and quiet in my mind today.",
  "I feel calm, comfortable, and unhurried as I go about my day.",
  "Feeling peaceful, calm, and content with the way things are.",
  "I am feeling calm, serene, and enjoying a quiet restful moment.",
  "Feeling very calm, balanced, and at ease in my surroundings.",
  "I feel calm and gentle, taking slow steady breaths.",
  "Feeling calm, relaxed, and completely free of tension.",
  "I am feeling calm, grounded, and present in this peaceful moment.",
  "Feeling calm, clear-headed, and tranquil after a quiet walk."
]

HAPPY_ADDITIONS = [
  "I am feeling so happy, cheerful, and full of positive energy today!",
  "Feeling extremely happy, excited, and grateful for this amazing news!",
  "I feel happy, joyful, and thrilled about how well things turned out.",
  "Feeling happy, blessed, and smiling from ear to ear today.",
  "I am feeling so happy, lighthearted, and optimistic about the future.",
  "Feeling happy, accomplished, and celebrating this wonderful moment!",
  "I feel happy, vibrant, and surrounded by warm supportive energy.",
  "Feeling so happy, delighted, and full of enthusiasm today!",
  "I am feeling happy, proud, and deeply satisfied with my progress.",
  "Feeling happy, cheerful, and enjoying a beautiful sunlit day."
]

data["anxious"].extend(ANXIOUS_ADDITIONS)
data["sad"].extend(SAD_ADDITIONS)
data["calm"].extend(CALM_ADDITIONS)
data["happy"].extend(HAPPY_ADDITIONS)

# Deduplicate
for k in data:
  data[k] = list(dict.fromkeys(data[k]))

corpus_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Updated mood_corpus.json: anxious={len(data['anxious'])}, sad={len(data['sad'])}, calm={len(data['calm'])}, happy={len(data['happy'])}")
