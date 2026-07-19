import type { AnalyticsData, DimensionKey } from "@/types/analytics";

export function buildEmptyAnalyticsData(): AnalyticsData {
  const emptyR2 = {} as Partial<Record<DimensionKey, number>>;

  return {
    totalSurveys: 0,
    totalRespondents: 0,
    responseRate: 0,
    cronbachAlpha: 0,
    promediosDimensiones: {
      calidad_sys: 0,
      calidad_info: 0,
      calidad_serv: 0,
      uso_sistema: 0,
      satis_user: 0,
      benef_netos: 0,
    },
    dimensionChartData: [],
    betaCoefficients: [],
    criticalQuestions: [],
    satisfactionDistribution: [],
    questionFrequencies: [],
    deloneMcleanModel: {
      sampleSize: 0,
      bootstrapSamples: 0,
      structuralPaths: [],
      constructReliability: [],
      discriminantValidity: [],
      rSquared: emptyR2,
    },
  };
}
