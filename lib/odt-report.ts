import {
  DIMENSIONS_MAP,
  type AnalyticsData,
  type DimensionKey,
} from "@/types/analytics";

export interface AiConclusions {
  satisfaction: string;
  descriptive: string;
  betas: string;
  frequencies: string;
  critical: string;
}

export interface OdtReportInput {
  courseName: string;
  generatedAt: string;
  analytics: AnalyticsData;
  aiConclusions: AiConclusions;
}

const ODT_NAMESPACES = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"`;

const ODT_META_NAMESPACES = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/"`;

const ODT_MANIFEST_NAMESPACES = `xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"`;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatScore(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatPercentage(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderCell(
  content: string,
  options: { header?: boolean; bold?: boolean } = {},
): string {
  const style = options.header ? "TableHeaderCell" : "TableBodyCell";
  const paragraphStyle = options.header ? "AIBold" : options.bold ? "AIBold" : "Body";
  return `<table:table-cell table:style-name="${style}" office:value-type="string"><text:p text:style-name="${paragraphStyle}">${escapeXml(content)}</text:p></table:table-cell>`;
}

function renderRow(
  cells: Array<{ content: string; header?: boolean; bold?: boolean }>,
): string {
  const rendered = cells
    .map((cell) => renderCell(cell.content, { header: cell.header, bold: cell.bold }))
    .join("");
  return `<table:table-row>${rendered}</table:table-row>`;
}

function renderTable(
  name: string,
  columnsCount: number,
  rows: Array<Array<{ content: string; header?: boolean; bold?: boolean }>>,
): string {
  const header = columnsCount > 0
    ? `<table:table-column table:number-columns-repeated="${columnsCount}"/>`
    : "";
  const body = rows.map((row) => renderRow(row)).join("");
  return `<table:table table:name="${escapeXml(name)}" table:style-name="TableGrid">${header}${body}</table:table>`;
}

function renderAiText(text: string): string {
  if (!text.trim()) {
    return "";
  }
  const lines = text.split(/\n/).map((line) => line.trim());
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      const bullets: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("• "))
      ) {
        const item = lines[i].replace(/^[-•]\s*/, "").trim();
        if (item) bullets.push(item);
        i += 1;
      }
      if (bullets.length > 0) {
        const items = bullets
          .map(
            (b) =>
              `<text:list-item><text:p text:style-name="Body">${escapeXml(b)}</text:p></text:list-item>`,
          )
          .join("");
        out.push(`<text:list text:style-name="ListBullet">${items}</text:list>`);
      }
      continue;
    }

    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      const content = line.slice(2, -2).trim();
      out.push(`<text:p text:style-name="AIBold">${escapeXml(content)}</text:p>`);
      i += 1;
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const content = line.replace(/^#{1,6}\s+/, "").trim();
      out.push(`<text:p text:style-name="Heading2">${escapeXml(content)}</text:p>`);
      i += 1;
      continue;
    }

    out.push(`<text:p text:style-name="Body">${escapeXml(line)}</text:p>`);
    i += 1;
  }

  return out.join("");
}

function renderKpiTable(analytics: AnalyticsData): string {
  const cronbachLabel =
    analytics.cronbachAlpha >= 0.7 ? "Adecuada" : "Revisar";
  return renderTable("KPI", 2, [
    [
      { content: "Indicador", header: true },
      { content: "Valor", header: true },
    ],
    [{ content: "Muestra actual (encuestas)" }, { content: String(analytics.totalSurveys) }],
    [
      { content: "Participacion" },
      {
        content: `${formatPercentage(analytics.responseRate)}% (${analytics.totalSurveys} de ${analytics.totalRespondents})`,
      },
    ],
    [
      { content: "Alfa de Cronbach (fiabilidad global)" },
      { content: `${formatScore(analytics.cronbachAlpha, 3)} - ${cronbachLabel}`, bold: true },
    ],
    [
      { content: "Satisfaccion promedio" },
      {
        content: `${formatScore(analytics.promediosDimensiones.satis_user)} / 5.0`,
        bold: true,
      },
    ],
  ]);
}

function renderDimensionTable(analytics: AnalyticsData): string {
  const orderedKeys: DimensionKey[] = [
    "calidad_sys",
    "calidad_info",
    "calidad_serv",
    "uso_sistema",
    "satis_user",
    "benef_netos",
  ];
  const rows: Array<Array<{ content: string; header?: boolean; bold?: boolean }>> = [
    [
      { content: "Dimension DeLone y McLean", header: true },
      { content: "Promedio (Likert 1-5)", header: true },
    ],
  ];
  for (const key of orderedKeys) {
    rows.push([
      { content: DIMENSIONS_MAP[key] },
      {
        content: formatScore(analytics.promediosDimensiones[key]),
        bold: true,
      },
    ]);
  }
  return renderTable("Dimensiones", 2, rows);
}

function renderBetaTable(analytics: AnalyticsData): string {
  const ordered = [...analytics.betaCoefficients].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value),
  );
  return renderTable("CoeficientesBeta", 2, [
    [
      { content: "Variable independiente", header: true },
      { content: "Coeficiente beta", header: true },
    ],
    ...ordered.map((beta) => [
      { content: beta.name },
      { content: formatScore(beta.value, 3), bold: true },
    ]),
  ]);
}

function renderSatisfactionTable(analytics: AnalyticsData): string {
  return renderTable("DistribucionSatisfaccion", 3, [
    [
      { content: "Categoria", header: true },
      { content: "Valor (n)", header: true },
      { content: "Porcentaje", header: true },
    ],
    ...analytics.satisfactionDistribution.map((entry) => [
      { content: entry.name },
      { content: String(entry.value), bold: true },
      { content: `${formatPercentage(entry.percentage)}%`, bold: true },
    ]),
  ]);
}

function renderCriticalQuestions(analytics: AnalyticsData): string {
  if (analytics.criticalQuestions.length === 0) {
    return `<text:p text:style-name="Body">No se detectaron preguntas criticas (promedio individual &lt; 3.0).</text:p>`;
  }
  return renderTable("PreguntasCriticas", 3, [
    [
      { content: "Dimension", header: true },
      { content: "Pregunta", header: true },
      { content: "Promedio", header: true },
    ],
    ...analytics.criticalQuestions.map((item) => [
      { content: DIMENSIONS_MAP[item.dimension] },
      { content: item.question },
      { content: `${formatScore(item.average)} / 5.0`, bold: true },
    ]),
  ]);
}

function renderAiSection(
  title: string,
  text: string,
): string {
  if (!text.trim()) {
    return "";
  }
  return `<text:p text:style-name="Heading2">${escapeXml(title)}</text:p>${renderAiText(text)}`;
}

function buildAutomaticStyles(): string {
  return `<office:automatic-styles><style:style style:name="TableGrid" style:family="table"><style:table-properties fo:margin-left="0cm" fo:margin-right="0cm" table:border-model="all" style:writing-mode="lr-tb"><style:table-cell-properties fo:border="0.5pt solid #000000" style:border-line-width="0.5pt" style:border-line-style="solid"/></style:table-properties></style:style><style:style style:name="TableHeaderCell" style:family="table-cell"><style:table-cell-properties fo:background-color="#e5e7eb" fo:border="0.5pt solid #000000" style:border-line-width="0.5pt" style:border-line-style="solid"/></style:style><style:style style:name="TableBodyCell" style:family="table-cell"><style:table-cell-properties fo:border="0.5pt solid #000000" style:border-line-width="0.5pt" style:border-line-style="solid"/></style:style></office:automatic-styles>`;
}

function buildContentBody(input: OdtReportInput): string {
  const { courseName, generatedAt, analytics, aiConclusions } = input;
  const formattedDate = formatGeneratedAt(generatedAt);

  const aiHasAny =
    Boolean(aiConclusions.satisfaction.trim()) ||
    Boolean(aiConclusions.descriptive.trim()) ||
    Boolean(aiConclusions.betas.trim()) ||
    Boolean(aiConclusions.frequencies.trim()) ||
    Boolean(aiConclusions.critical.trim());

  const aiBlock = aiHasAny
    ? [
        `<text:p text:style-name="Heading1">6. Conclusiones del Analisis de IA</text:p>`,
        renderAiSection(
          "6.1 Distribucion de Niveles de Satisfaccion",
          aiConclusions.satisfaction,
        ),
        renderAiSection("6.2 Analisis Descriptivo", aiConclusions.descriptive),
        renderAiSection(
          "6.3 Analisis Predictivo / Causal",
          aiConclusions.betas,
        ),
        renderAiSection(
          "6.4 Histograma de Frecuencias por Pregunta",
          aiConclusions.frequencies,
        ),
        renderAiSection(
          "6.5 Preguntas Criticas",
          aiConclusions.critical,
        ),
      ]
        .filter(Boolean)
        .join("")
    : "";

  return [
    `<text:p text:style-name="Title">Reporte Estadistico de Auditoria de Sistemas de Informacion</text:p>`,
    `<text:p text:style-name="Subtitle">Curso: ${escapeXml(courseName)} - Fecha: ${escapeXml(formattedDate)}</text:p>`,
    `<text:p text:style-name="Heading1">1. Resumen de Indicadores</text:p>`,
    renderKpiTable(analytics),
    `<text:p text:style-name="Heading1">2. Distribucion de Niveles de Satisfaccion Global</text:p>`,
    renderSatisfactionTable(analytics),
    `<text:p text:style-name="Heading1">3. Promedios por Dimension DeLone y McLean</text:p>`,
    renderDimensionTable(analytics),
    `<text:p text:style-name="Heading1">4. Coeficientes Beta (Regresion Lineal Multiple)</text:p>`,
    renderBetaTable(analytics),
    `<text:p text:style-name="Heading1">5. Preguntas Criticas</text:p>`,
    renderCriticalQuestions(analytics),
    aiBlock,
    `<text:p text:style-name="Footer">Generado el ${escapeXml(formattedDate)} - Plataforma DeLone y McLean</text:p>`,
  ].join("");
}

export function buildContentXml(input: OdtReportInput): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${ODT_NAMESPACES} office:version="1.2">
${buildAutomaticStyles()}
<office:body>
<office:text>
${buildContentBody(input)}
</office:text>
</office:body>
</office:document-content>`;
}

export function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${ODT_NAMESPACES} office:version="1.2">
<office:styles>
<style:default-style style:family="paragraph">
<style:paragraph-properties fo:text-align="start" style:writing-mode="page" fo:margin-top="0cm" fo:margin-bottom="0.5cm"/>
</style:default-style>
<style:style style:name="Title" style:family="paragraph">
<style:paragraph-properties fo:text-align="center" fo:margin-top="0.5cm" fo:margin-bottom="0.5cm"/>
<style:text-properties fo:font-size="20pt" fo:font-weight="bold" style:font-name="Arial"/>
</style:style>
<style:style style:name="Subtitle" style:family="paragraph">
<style:paragraph-properties fo:text-align="center" fo:margin-bottom="1cm"/>
<style:text-properties fo:font-size="12pt" style:font-name="Arial"/>
</style:style>
<style:style style:name="Heading1" style:family="paragraph">
<style:paragraph-properties fo:margin-top="0.8cm" fo:margin-bottom="0.3cm" style:keep-with-next="true"/>
<style:text-properties fo:font-size="14pt" fo:font-weight="bold" style:font-name="Arial"/>
</style:style>
<style:style style:name="Heading2" style:family="paragraph">
<style:paragraph-properties fo:margin-top="0.5cm" fo:margin-bottom="0.2cm" style:keep-with-next="true"/>
<style:text-properties fo:font-size="12pt" fo:font-weight="bold" style:font-name="Arial"/>
</style:style>
<style:style style:name="Body" style:family="paragraph">
<style:paragraph-properties fo:margin-bottom="0.2cm"/>
<style:text-properties fo:font-size="11pt" style:font-name="Arial"/>
</style:style>
<style:style style:name="AIBold" style:family="paragraph">
<style:paragraph-properties fo:margin-bottom="0.2cm"/>
<style:text-properties fo:font-size="11pt" fo:font-weight="bold" style:font-name="Arial"/>
</style:style>
<style:style style:name="Footer" style:family="paragraph">
<style:paragraph-properties fo:text-align="center" fo:margin-top="1.5cm"/>
<style:text-properties fo:font-size="9pt" fo:color="#6b7280" style:font-name="Arial"/>
</style:style>
<style:style style:name="ListBullet" style:family="list">
<style:list-level-properties><style:list-level-style-bullet text:level="1" text:bullet-char="*" style:num-suffix=" "/></style:list-level-properties>
</style:style>
</office:styles>
</office:document-styles>`;
}

export function buildMetaXml(input: Pick<OdtReportInput, "courseName" | "generatedAt">): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta ${ODT_META_NAMESPACES} office:version="1.2">
<office:meta>
<meta:generator>Plataforma DeLone y McLean</meta:generator>
<dc:title>Reporte de Auditoria - ${escapeXml(input.courseName)}</dc:title>
<dc:date>${escapeXml(input.generatedAt)}</dc:date>
<dc:language>es-ES</dc:language>
</office:meta>
</office:document-meta>`;
}

export function buildManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest ${ODT_MANIFEST_NAMESPACES} manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="META-INF/manifest.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
}

export const ODT_MIMETYPE = "application/vnd.oasis.opendocument.text";
