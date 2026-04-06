import "server-only";

export interface MoodleError {
  exception: string;
  errorcode?: string;
  message: string;
}

const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

if (!MOODLE_URL) {
  throw new Error("Missing required env var: NEXT_PUBLIC_MOODLE_BASE_URL");
}

if (!MOODLE_TOKEN) {
  throw new Error("Missing required env var: MOODLE_TOKEN");
}

const wsToken = MOODLE_TOKEN as string;
const REST_ENDPOINT = `${MOODLE_URL}/webservice/rest/server.php`;

const isMoodleError = (value: unknown): value is MoodleError => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MoodleError>;
  return (
    typeof candidate.exception === "string" &&
    typeof candidate.message === "string"
  );
};

export async function fetchMoodle<T>(
  wsFunction: string,
  params: Record<string, string> = {},
): Promise<T> {
  const body = new URLSearchParams({
    wstoken: wsToken,
    wsfunction: wsFunction,
    moodlewsrestformat: "json",
    ...params,
  });

  const response = await fetch(REST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Moodle request failed with status ${response.status} ${response.statusText}`,
    );
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new Error("Moodle response is not valid JSON");
  }

  if (isMoodleError(payload)) {
    const detail = payload.errorcode
      ? `${payload.exception} (${payload.errorcode}): ${payload.message}`
      : `${payload.exception}: ${payload.message}`;
    throw new Error(
      `Moodle API error for wsfunction "${wsFunction}": ${detail}`,
    );
  }

  return payload as T;
}
