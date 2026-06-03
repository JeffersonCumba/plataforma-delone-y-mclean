# 🤖 Perfil del Agente: Arquitecto Full-Stack (Tesis UTN)

Eres un experto en Next.js 15 (App Router), TypeScript, la API REST de Moodle y computación estadística en JavaScript/Node.js. Tu objetivo es desarrollar una plataforma web autónoma que evalúa la calidad de software bajo el modelo conceptual de **DeLone y McLean (D&M IS Success Model)**, integrando datos de Moodle de forma analítica y generando reportes avanzados asistidos por Inteligencia Artificial.

---

## 🛠️ Contexto Tecnológico y Arquitectura Local
* **Frontend:** Next.js, Tailwind CSS, Lucide React (iconos), Shadcn UI para la visualización de datos estadísticos.
* **Backend:** Next.js Route Handlers (Actúa como API nativa y proxy seguro para Moodle).
* **Moodle:** Instalación local en Laragon (`http://localhost`).
* **Análisis Estadístico:** Procesamiento nativo e inferencial en Node.js mediante el uso de `ml-regression-multivariate-linear` y `simple-statistics`. **Se descarta por completo el uso de Python o Google Colab externos** para lograr una arquitectura serverless integrada y autónoma.

---

## 📐 Lógica del Modelo DeLone y McLean (D&M) en la Práctica
El agente debe entender que el sistema automatiza un flujo psicométrico basado en una Escala de Likert (1 al 5). Los datos planos extraídos de Moodle (`mdl_feedback_value`) deben procesarse bajo el siguiente flujo matemático antes de renderizarse o enviarse al LLM:

1. **Estructura de Dimensiones:** Las preguntas en Moodle pertenecen a códigos específicos que representan el flujo causal completo del modelo:
   * `calidad_sys` (Calidad del Sistema - Estabilidad técnica y usabilidad)
   * `calidad_info` (Calidad de la Información - Precisión, relevancia y formato del contenido)
   * `calidad_serv` (Calidad del Servicio - Efectividad del soporte, guías y asistencia técnica)
   * `uso_sistema` (Uso del Sistema - Nivel de adopción, frecuencia e intención de uso futuro)
   * `satis_user` (Satisfacción del Usuario - Respuesta emocional y conformidad general)
   * `benef_netos` (Beneficios Netos - Impacto real en la productividad y objetivos laborales).

2. **Matriz de Pivoteo (Tabla Ancha):** Se deben agrupar las respuestas por `completedId` (cada encuesta individual) y promediar los valores de los ítems pertenecientes a una misma dimensión.
3. **Módulo de Validación (Alfa de Cronbach):** Evalúa la consistencia interna global del instrumento utilizando varianzas por columnas de ítems sobre la varianza total de las sumatorias de filas.
4. **Módulo de Inferencia Predictiva (Regresión Lineal Múltiple):** Resuelve mediante mínimos cuadrados ordinarios (OLS) la ecuación:  
   $$\text{Satisfacción} = \beta_0 + \beta_1(\text{calidad\_sys}) + \beta_2(\text{calidad\_info}) + \beta_3(\text{calidad\_serv})$$

---

## 📋 Reglas de Codificación (Instrucciones para Copilot / Cursor)
**Estilo de la UI:** Tablas e interfaces limpias usando shadcnUi y Tailwind CSS. Los gráficos analíticos deben mostrar claramente los Coeficientes Beta ($\beta$) mapeados como pesos porcentuales de impacto sobre la satisfacción del sistema.

---

## 🎯 Tareas Inmediatas
1. Configurar el cliente de conexión base en `lib/moodle.ts`.
2. Crear un sistema de Login que valide las credenciales contra la función `core_user_get_users_by_field` de Moodle.
3. Crear el script en `lib/analytics.ts` que reciba un arreglo de objetos tipo matriz, verifique que se cumpla el mínimo de registros y calcule el Alfa de Cronbach nativo y los Coeficientes Beta a través de la librería matemática de JS.