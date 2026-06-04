import {
  DIMENSIONS_MAP,
  type AnalyticsData,
} from "@/types/analytics";

export function buildSystemPrompt(
  courseName: string,
  analytics: AnalyticsData,
): string {
  const criticalBlock = analytics.criticalQuestions
    .map(
      (item) =>
        `- "${item.question}" (${DIMENSIONS_MAP[item.dimension]}) -> ${item.average.toFixed(2)}/5`,
    )
    .join("\n");

  const betaBlock = analytics.betaCoefficients
    .map((beta) => `- ${beta.name}: beta = ${beta.value.toFixed(3)}`)
    .join("\n");

  const dimensionBlock = analytics.dimensionChartData
    .map((dim) => `- ${dim.name}: ${dim.score.toFixed(2)}/5`)
    .join("\n");

  const satisfactionBlock = analytics.satisfactionDistribution
    .map(
      (item) =>
        `- ${item.name}: ${item.value} alumnos (${item.percentage.toFixed(1)}%)`,
    )
    .join("\n");

  const frequenciesBlock = analytics.questionFrequencies
    .map((q) => {
      const total =
        q["Totalmente en desacuerdo"] +
        q["En desacuerdo"] +
        q.Neutral +
        q["De acuerdo"] +
        q["Totalmente de acuerdo"];
      const mean =
        total > 0
          ? (
              (q["Totalmente en desacuerdo"] * 1 +
                q["En desacuerdo"] * 2 +
                q.Neutral * 3 +
                q["De acuerdo"] * 4 +
                q["Totalmente de acuerdo"] * 5) /
              total
            ).toFixed(2)
          : "0.00";
      return `- ${q.pregunta} [${DIMENSIONS_MAP[q.dimension]}] (n=${total}, media=${mean}/5)`;
    })
    .join("\n");

  return [
    "Eres un analista experto en el Modelo de Exito de Sistemas de Informacion de DeLone y McLean.",
    "Asistes a un profesor interpretando los resultados analiticos de su curso en Moodle.",
    "",
    "### Reglas de respuesta (estrictas)",
    "- Responde SIEMPRE en espanol.",
    "- Se extremadamente conciso: usa 1 frase de titulo + maximo 3 a 5 viñetas cortas.",
    "- Cada viñeta: una sola idea, maximo 1-2 lineas. Sin parrafos largos.",
    "- Ve directo al punto: que significa el dato, por que importa, que hacer.",
    "- Prioriza lo mas importante: primero alertas criticas, luego conductores causales, luego el resto.",
    "- Cita numeros especificos del contexto cuando refuercen la conclusion.",
    "- Si sugieren acciones, alinealas a las 6 dimensiones DeLone y McLean.",
    "- Si el usuario pide algo que no esta en los datos, indicalo brevemente sin inventar.",
    "- Evita introducciones, conclusiones largas, relleno y cortesia innecesaria.",
    "",
    "### Contexto del curso",
    `Curso: ${courseName}`,
    `Encuestas respondidas: ${analytics.totalSurveys} de ${analytics.totalRespondents} (${analytics.responseRate.toFixed(1)}%)`,
    `Alfa de Cronbach (fiabilidad global): ${analytics.cronbachAlpha.toFixed(3)}`,
    "",
    "### Promedio por dimension (Likert 1-5)",
    dimensionBlock,
    "",
    "### Distribucion de satisfaccion global",
    satisfactionBlock,
    "",
    "### Betas de regresion (impacto sobre la satisfaccion)",
    betaBlock,
    "",
    "### Preguntas criticas (promedio < 3.0)",
    criticalBlock || "Sin preguntas criticas detectadas.",
    "",
    "### Frecuencias por pregunta (resumen)",
    frequenciesBlock,
  ].join("\n");
}
