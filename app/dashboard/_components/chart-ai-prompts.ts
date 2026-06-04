import { type AnalyticsData } from "@/types/analytics";

export function buildDescriptivePrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const table = analytics.dimensionChartData
    .map((dimension) => `- ${dimension.name}: ${dimension.score.toFixed(2)} / 5`)
    .join("\n");

  return [
    `Interpreta el **histograma de promedios por las 6 dimensiones DeLone y McLean** del curso "${courseName}".`,
    "",
    "Promedios por dimensión (escala Likert 1-5):",
    table,
    "",
    "Tu respuesta debe incluir:",
    "- Dimensión más fuerte y por qué.",
    "- Dimensión más débil y por qué.",
    "- Balance general del perfil del curso.",
    "- 2-3 acciones priorizadas de mejora.",
  ].join("\n");
}

export function buildBetasPrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const table = analytics.betaCoefficients
    .map((beta) => `- ${beta.name}: beta = ${beta.value.toFixed(3)}`)
    .join("\n");

  return [
    `Interpreta los **coeficientes beta de la regresión lineal múltiple** (impacto causal sobre la satisfacción) del curso "${courseName}".`,
    "",
    "Coeficientes estandarizados:",
    table,
    "",
    "Tu respuesta debe incluir:",
    "- Variable con mayor impacto causal y magnitud práctica.",
    "- Lectura de betas negativos o cercanos a 0.",
    "- 2-3 decisiones o hipótesis de mejora.",
  ].join("\n");
}

export function buildCriticalQuestionsPrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const list = analytics.criticalQuestions
    .map(
      (item) =>
        `- "${item.question}" (${item.dimension}) = ${item.average.toFixed(2)} / 5`,
    )
    .join("\n");

  return [
    `Interpreta las **preguntas críticas detectadas** (promedio individual < 3.0) del curso "${courseName}".`,
    "",
    "Preguntas:",
    list || "Sin preguntas críticas detectadas.",
    "",
    "Para cada una, propón una acción concreta de mejora y, si aplica, sugiere reformular la pregunta.",
  ].join("\n");
}

export function buildSatisfactionDistributionPrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const total = analytics.satisfactionDistribution.reduce(
    (acc, item) => acc + item.value,
    0,
  );
  const distribution = analytics.satisfactionDistribution
    .map(
      (item) =>
        `- ${item.name}: ${item.value} alumnos (${item.percentage.toFixed(1)}%)`,
    )
    .join("\n");

  return [
    `Interpreta la **Distribución de Niveles de Satisfacción Global** del curso "${courseName}".`,
    "",
    `Total de usuarios clasificados: ${total}.`,
    `Población matriculada: ${analytics.totalRespondents}.`,
    "",
    "Distribución por categoría:",
    distribution,
    "",
    "Tu respuesta debe incluir:",
    "- Lectura general: ¿la población es mayormente satisfecha, neutral o insatisfecha?",
    "- Proporción preocupante (si aplica) de insatisfechos o neutrales.",
    "- 2-3 acciones priorizadas para incrementar la proporción de satisfechos y reducir insatisfechos.",
  ].join("\n");
}

export function buildFrequenciesPrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const totalPerQuestion = (q: (typeof analytics.questionFrequencies)[number]) =>
    q["Totalmente en desacuerdo"] +
    q["En desacuerdo"] +
    q.Neutral +
    q["De acuerdo"] +
    q["Totalmente de acuerdo"];

  const enriched = analytics.questionFrequencies
    .map((q) => {
      const total = totalPerQuestion(q);
      const positive = q["De acuerdo"] + q["Totalmente de acuerdo"];
      const negative = q["Totalmente en desacuerdo"] + q["En desacuerdo"];
      const positivePct = total > 0 ? (positive / total) * 100 : 0;
      const negativePct = total > 0 ? (negative / total) * 100 : 0;
      return { ...q, total, positivePct, negativePct };
    })
    .sort((a, b) => b.positivePct - a.positivePct);

  const top = enriched.slice(0, 5);
  const bottom = enriched.slice(-5).reverse();

  const topBlock = top
    .map(
      (q) =>
        `- ${q.pregunta} (${q.dimension}): ${q.positivePct.toFixed(1)}% positivas, ${q.negativePct.toFixed(1)}% negativas — n=${q.total}`,
    )
    .join("\n");
  const bottomBlock = bottom
    .map(
      (q) =>
        `- ${q.pregunta} (${q.dimension}): ${q.positivePct.toFixed(1)}% positivas, ${q.negativePct.toFixed(1)}% negativas — n=${q.total}`,
    )
    .join("\n");

  return [
    `Interpreta el **Histograma de Frecuencias Likert por Pregunta** del curso "${courseName}".`,
    "",
    `Total de preguntas: ${enriched.length}. Escala: 1=Totalmente en desacuerdo, 2=En desacuerdo, 3=Neutral, 4=De acuerdo, 5=Totalmente de acuerdo.`,
    "",
    "Top 5 preguntas con mayor concentración de respuestas positivas (4-5):",
    topBlock,
    "",
    "Top 5 preguntas con mayor concentración de respuestas negativas (1-2):",
    bottomBlock,
    "",
    "Tu respuesta debe incluir:",
    "- Preguntas con sesgo positivo claro y por qué.",
    "- Preguntas con sesgo negativo o neutras preocupantes.",
    "- Patrones observables por dimensión (calidad_sys, calidad_info, etc.).",
    "- 2-3 acciones priorizadas de mejora.",
  ].join("\n");
}