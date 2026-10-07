export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { cvText } = req.body || {};

        if (!cvText) {
            return res.status(400).json({
                error: "CV text is required."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API key is not configured."
            });
        }

        const prompt = `
You are JobTsela's professional CV assistant.

Analyse the candidate's CV and provide a professional assessment.

Rules:
- Never invent qualifications.
- Never invent work experience.
- Never invent employers.
- Never invent dates.
- Never invent skills.
- Preserve factual information.
- Identify weak or unclear wording.
- Suggest stronger professional wording where appropriate.
- Identify missing information that would improve the CV.
- Keep recommendations relevant to employment and ATS optimisation.

Candidate CV:

${cvText}
`;

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 20000);

        try {

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },

                    signal: controller.signal,

                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ],

                        generationConfig: {
                            thinkingConfig: {
                                thinkingLevel: "low"
                            }
                        }
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                return res.status(response.status).json({
                    error:
                        data?.error?.message ||
                        "Gemini API request failed."
                });
            }

            const result =
                data?.candidates?.[0]?.content?.parts
                    ?.map((part) => part.text || "")
                    .join("") || "";

            if (!result) {
                return res.status(500).json({
                    error: "Gemini returned no usable response."
                });
            }

            return res.status(200).json({
                success: true,
                result
            });

        } finally {

            clearTimeout(timeout);

        }

    } catch (error) {

        if (error?.name === "AbortError") {
            return res.status(504).json({
                error: "Gemini request timed out."
            });
        }

        return res.status(500).json({
            error: error?.message || "Server error."
        });
    }
}